import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

type Test = {
  patient_id: number;
  test_type: string;
  value: number;
  minlimit: number;
  maxlimit: number;
  unit: string;
  test_timestamp: string;
  status: number;  // 1 = Normal, 0 = Abnormal
  created_at: string;
};

export async function sendReportEmail(
  patientEmail: string,
  criticalTests: Test[],
  normalTests: Test[]
) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const subject = '🩺 Your DiagNexus Medical Report';

  const renderStatusChip = (status: number) => {
    if (status === 1) {
      return `<span style="
        display:inline-block;
        padding:2px 8px;
        color:#155724;
        background-color:#d4edda;
        border-radius:12px;
        font-weight:bold;
        font-size:0.8em;
        ">Normal</span>`;
    } else {
      return `<span style="
        display:inline-block;
        padding:2px 8px;
        color:#721c24;
        background-color:#f8d7da;
        border-radius:12px;
        font-weight:bold;
        font-size:0.8em;
        ">Abnormal</span>`;
    }
  };

  const createTableRows = (tests: Test[]) => {
    return tests
      .map(
        (t) => `
      <tr>
        <td>${t.test_type}</td>
        <td>${t.value} ${t.unit}</td>
        <td>${t.minlimit} - ${t.maxlimit}</td>
        <td>${renderStatusChip(t.status)}</td>
      </tr>`
      )
      .join('');
  };

  const html = `
    <p>Hello,</p>
    <p>Your medical report is now available. Below is a summary:</p>

    ${
      criticalTests.length > 0
        ? `
      <h3 style="color:red;">🔴 Critical Tests</h3>
      <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr style="background-color:#f8d7da;">
            <th>Test</th>
            <th>Value</th>
            <th>Reference Range</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${createTableRows(criticalTests)}
        </tbody>
      </table>
      `
        : `<p>No critical test results.</p>`
    }

    ${
      normalTests.length > 0
        ? `
      <h3 style="color:green;">✅ Normal Tests</h3>
      <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr style="background-color:#d4edda;">
            <th>Test</th>
            <th>Value</th>
            <th>Reference Range</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${createTableRows(normalTests)}
        </tbody>
      </table>
      `
        : ''
    }

    <p>For a full report, please log in to your DiagNexus account.</p>
    <p>Regards,<br/>DiagNexus Team</p>
  `;

  const mailOptions = {
    from: `"DiagNexus" <${process.env.SMTP_USER}>`,
    to: patientEmail,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent to:', patientEmail, '| Message ID:', info.messageId);
    return info;
  } catch (err) {
    console.error('❌ Failed to send email:', err);
    throw err;
  }
}
