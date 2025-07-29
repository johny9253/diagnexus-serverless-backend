"use strict";
// import { SQSHandler } from 'aws-lambda';
// import { S3 } from 'aws-sdk';
// import { v4 as uuidv4 } from 'uuid';
// const s3 = new S3();
// export const handler: SQSHandler = async (event) => {
//   console.log('Received SQS message:', JSON.stringify(event, null, 2));
//   for (const record of event.Records) {
//     const body = JSON.parse(record.body);
//     const key = `records/${uuidv4()}.json`;
//     try {
//       await s3.putObject({
//         Bucket: process.env.S3_BUCKET!,
//         Key: key,
//         Body: JSON.stringify(body),
//         ContentType: 'application/json',
//       }).promise();
//       console.log(`Saved record to S3 at ${key}`);
//     } catch (err) {
//       console.error('Error saving to S3:', err);
//       throw err;
//     }
//   }
// };
