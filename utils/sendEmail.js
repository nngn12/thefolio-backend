const nodemailer = require("nodemailer");

const sendVerificationEmail = async (email, token) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const verificationUrl = `${process.env.BASE_URL}/api/auth/verify/${token}`;

    await transporter.sendMail({
        from: '"Captured Memories" <noreply@gmail.com>',
        to: email,
        subject: "Verify Your Email - Captured Memories",
        html: `
            <div style="font-family: sans-serif; text-align: center;">
                <h2>Welcome to Captured Memories!</h2>
                <p>Click the button below to verify your email and activate your account.</p>
                <a href="${verificationUrl}" style="background: #ec4899; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; display: inline-block;">Verify Email</a>
                <p>If the button doesn't work, copy this link: ${verificationUrl}</p>
            </div>
        `,
    });
};

module.exports = sendVerificationEmail;