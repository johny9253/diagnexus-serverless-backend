import { S3Event } from 'aws-lambda';

export const createMockS3Event = (
  bucketName: string = 'test-bucket',
  objectKey: string = 'deepak_3.pdf'
): S3Event => ({
  Records: [
    {
      eventVersion: '2.1',
      eventSource: 'aws:s3',
      awsRegion: 'us-east-1',
      eventTime: new Date().toISOString(),
      eventName: 'ObjectCreated:Put',
      userIdentity: { principalId: 'EXAMPLE' },
      requestParameters: { sourceIPAddress: '127.0.0.1' },
      responseElements: {
        'x-amz-request-id': 'example-request-id',
        'x-amz-id-2': 'example-id',
      },
      s3: {
        s3SchemaVersion: '1.0',
        configurationId: 'testConfig',
        bucket: {
          name: bucketName,
          ownerIdentity: { principalId: 'EXAMPLE' },
          arn: `arn:aws:s3:::${bucketName}`,
        },
        object: {
          key: objectKey,
          size: 1024,
          eTag: 'mock-etag',
          sequencer: 'mock-sequencer',
        },
      },
    },
  ],
});

export const mockPdfBuffer = Buffer.from('Mock PDF content');

export const mockPdfText = `
PATIENT MEDICAL REPORT
Name: John Doe
Date: 10/Apr/2025 05:30PM

Test Results:
HAEMOGLOBIN (Hb): 14.9 gm/dL (Normal: 12.0-15.0)
WHITE BLOOD CELLS: 8500 /mm³ (Normal: 4000-11000)
PLATELET COUNT: 450000 /mm³ (Normal: 150000-400000)
CHOLESTEROL: 240 mg/dL (Normal: <200)
`;

export const mockOpenAIResponse = JSON.stringify([
  {
    test_type: 'HAEMOGLOBIN (Hb)',
    value: 14.9,
    minlimit: 12.0,
    maxlimit: 15.0,
    unit: 'gm/dL',
    timestamp: '10/Apr/2025 05:30PM'
  },
  {
    test_type: 'WHITE BLOOD CELLS',
    value: 8500,
    minlimit: 4000,
    maxlimit: 11000,
    unit: '/mm³',
    timestamp: '10/Apr/2025 05:30PM'
  },
  {
    test_type: 'PLATELET COUNT',
    value: 450000,
    minlimit: 150000,
    maxlimit: 400000,
    unit: '/mm³',
    timestamp: '10/Apr/2025 05:30PM'
  },
  {
    test_type: 'CHOLESTEROL',
    value: 240,
    minlimit: 0,
    maxlimit: 200,
    unit: 'mg/dL',
    timestamp: '10/Apr/2025 05:30PM'
  }
]);

export const mockDbUser = {
  rows: [{ email: 'test@example.com' }],
  rowCount: 1
};

export const mockDbQuery = jest.fn();
