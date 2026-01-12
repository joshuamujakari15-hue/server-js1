import { Resend } from "resend";

const resend = new Resend("re_C7Kk53U3_Ki12PEdJzZQhAP72gtKYHLw2"); // <-- key MUST be in quotes

async function testEmail() {
  const response = await resend.emails.send({
    from: "hello@yourdomain.com",
    to: "youremail@example.com",
    subject: "Test Email from JoshWebs",
    html: "<p>Hello! This is a test email from JoshWebs.</p>",
  });
  console.log("Email sent:", response);
}

testEmail();
