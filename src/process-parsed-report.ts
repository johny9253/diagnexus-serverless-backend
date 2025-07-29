import { S3Event } from "aws-lambda";
import AWS from "aws-sdk";
import pdfParse from "pdf-parse";
import OpenAI from "openai";
import dotenv from "dotenv";
import db from "./database";
import { sendReportEmail } from "./sendEmail";
dotenv.config();
// if (require.main === module) {
//   const fs = require('fs');
//   const path = require('path');

//   const localPdfPath = path.resolve(
//     'C:/Projects/Personal Project/AWS Training Proj/lambda-project/testeron/deepak.pdf'
//   );

//   AWS.S3.prototype.getObject = function () {
//     console.log('🧪 Mocked s3.getObject called');
//     const bodyBuffer = fs.readFileSync(localPdfPath);

//     // 👇 Cast to satisfy TypeScript's expected return type
//     return {
//       promise: async () => ({
//         Body: bodyBuffer,
//       }),
//     } as unknown as AWS.Request<AWS.S3.GetObjectOutput, AWS.AWSError>;
//   };
// }
// AWS.config.update({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
//   region: process.env.AWS_REGION || "us-east-1",
// });
const s3 = new AWS.S3();
// Azure OpenAI config
const openai = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL:
    "https://qhteamopenaikey.openai.azure.com/openai/deployments/gpt-4o-mini",
  defaultQuery: { "api-version": "2025-01-01-preview" },
  defaultHeaders: { "api-key": process.env.AZURE_OPENAI_API_KEY! },
});

export const handler = async (event: S3Event): Promise<void> => {
  try {
    for (const record of event.Records) {
      const bucketName = record.s3.bucket.name;
      // const bucketName = '';
      const objectKey = decodeURIComponent(
        record.s3.object.key.replace(/\+/g, " ")
      );
      // const objectKey = '';
      console.log(
        `📥 Processing file from bucket: ${bucketName}, key: ${objectKey}`
      );
      const fileData = await s3
        .getObject({ Bucket: bucketName, Key: objectKey })
        .promise();
      console.log("✅ Got file from S3. Size:", fileData?.Body);
      if (!fileData.Body) throw new Error("❌ Empty file body from S3");
      console.log("➡️ Parsing PDF...");
      const pdfData = await pdfParse(fileData.Body as Buffer);
      console.log(
        "✅ Parsed PDF. First 100 chars:",
        pdfData.text.slice(0, 100)
      );
      const text = pdfData.text;

      console.log("📄 Extracted PDF text:", text.slice(0, 500));

      const prompt = `
You are a medical report parser.

From the PDF text below, extract all test results as an array of JSON objects with the following fields:
- test_type (string)
- value (number or string)
- maxlimit (number)
- minlimit (number)
- unit (string or null)
- timestamp (string in original format or ISO)

Instructions:
- The text may contain many test results — extract ALL of them.
- If a field is missing for a test, set its value to null.
- Return ONLY the raw JSON array (no Markdown, no comments, no explanation).
- Do NOT wrap the response in \`\`\`json or any code block.
- If test does not have a maxlimit, minlimit skip it.
Example format:
[
  {
    "test_type": "HAEMOGLOBIN (Hb)",
    "value": 14.9,
    "minlimit": 17.0,
    "maxlimit": 18.0,
    "unit": "gm/dL",
    "timestamp": "10/Apr/2025 05:30PM"
  }
]

PDF Text:
${text}
`;

      console.log("➡️ Calling OpenAI...");
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // required even for Azure!
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
      });
      const aiResponse = completion.choices[0].message?.content?.trim() || "{}";
      console.log("🤖 OpenAI response:", aiResponse);

      const report = JSON.parse(aiResponse);
      console.log("✅ Parsed report:", report);

      //store data in database
      // Extract patient_id from filename (e.g., "deepak_3.pdf" => 3)
      const match = objectKey.match(/_(\d+)\.pdf$/);
      if (!match)
        throw new Error("❌ Unable to extract patient_id from S3 key");
      const patientId = parseInt(match[1]);
      type Test = {
        patient_id: number;
        test_type: string;
        value: number;
        minlimit: number;
        maxlimit: number;
        unit: string;
        test_timestamp: string;
        status: number;
        created_at: string;
      };
      const inRangeTests: Test[] = [];
      const outOfRangeTests: Test[] = [];

      const now = new Date().toISOString();

      for (const test of report) {
        const { test_type, value, minlimit, maxlimit, unit, timestamp } = test;

        // Skip if limits are not available
        if (minlimit == null || maxlimit == null) continue;

        const numericValue = parseFloat(value);
        const isInRange = numericValue >= minlimit && numericValue <= maxlimit;

        const testObj = {
          patient_id: patientId,
          test_type,
          value: numericValue,
          minlimit,
          maxlimit,
          unit,
          test_timestamp: now, // or use timestamp if already a valid format
          status: isInRange ? 1 : 0,
          created_at: now,
        };

        if (isInRange) {
          inRangeTests.push(testObj);
        } else {
          outOfRangeTests.push(testObj);
        }

        // Insert into DB
        await db.query(
          `INSERT INTO report_test
    (patient_id, test_type, value, minlimit, maxlimit, unit, test_timestamp, status, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            testObj.patient_id,
            testObj.test_type,
            testObj.value,
            testObj.minlimit,
            testObj.maxlimit,
            testObj.unit,
            testObj.test_timestamp,
            testObj.status,
            testObj.created_at,
          ]
        );
      }

      console.log(
        `✅ Inserted ${inRangeTests.length} in-range tests and ${outOfRangeTests.length} out-of-range tests into DB`
      );

      // get user email from patient_id
      const userResult = await db.query(
        `SELECT email FROM users WHERE user_id = $1`,
        [patientId]
      );

      if (userResult.rowCount === 0) {
        throw new Error(`❌ No user found with ID ${patientId}`);
      }
      const userEmail = userResult.rows[0].email;
      console.log(`📧 Found user email: ${userEmail}`);     
      // TODO: send SMTP to user
      await sendReportEmail(userEmail, outOfRangeTests, inRangeTests);
    }
  } catch (err) {
    console.error("❌ Lambda error:", err);
    if (err instanceof Error) {
      console.error("❌ Stack trace:", err.stack);
    } else {
      try {
        console.error("❌ Error (stringified):", JSON.stringify(err));
      } catch (e) {
        console.error("❌ Error could not be stringified.");
      }
    }
  }
};

// --- Only run this block when executing locally ---
// if (require.main === module) {
//   import("fs").then((fsModule) => {
//     import("path").then((pathModule) => {
//       const fs = fsModule.default;
//       const path = pathModule.default;

//       const localPdfPath = path.resolve(
//         "C:/Projects/Personal Project/AWS Training Proj/lambda-project/testeron/deepak.pdf"
//       );
//       const s3 = new AWS.S3();
//       s3.getObject = ((params: AWS.S3.GetObjectRequest) => {
//         console.log("🔁 Mocked s3.getObject called");
//         return {
//           promise: async () => ({
//             Body: fs.readFileSync(localPdfPath),
//           }),
//         } as any;
//       }) as any;

//       // ✅ Create a mocked S3 event
//       const mockEvent: S3Event = {
//         Records: [
//           {
//             eventVersion: "2.1",
//             eventSource: "aws:s3",
//             awsRegion: "us-east-1",
//             eventTime: new Date().toISOString(),
//             eventName: "ObjectCreated:Put",
//             userIdentity: { principalId: "EXAMPLE" },
//             requestParameters: { sourceIPAddress: "127.0.0.1" },
//             responseElements: {
//               "x-amz-request-id": "example-request-id",
//               "x-amz-id-2": "example-id",
//             },
//             s3: {
//               s3SchemaVersion: "1.0",
//               configurationId: "testConfig",
//               bucket: {
//                 name: "diagnexus-medical-reports",
//                 ownerIdentity: { principalId: "EXAMPLE" },
//                 arn: "arn:aws:s3:::diagnexus-medical-reports",
//               },
//               object: {
//                 key: "1752425200816deepak_3.pdf",
//                 size: fs.statSync(localPdfPath).size,
//                 eTag: "mock-etag",
//                 sequencer: "mock-sequencer",
//               },
//             },
//           },
//         ],
//       };
//       handler(mockEvent)
//         .then(() => console.log("✅ Local Lambda execution completed"))
//         .catch((err) => console.error("❌ Local Lambda error:", err));
//     });
//   });
// }
