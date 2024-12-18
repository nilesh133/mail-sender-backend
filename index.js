const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { google } = require('googleapis');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
    origin: "*",
    method: ["GET", "POST"]
}

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({ storage });

// Google OAuth2 Client Setup
const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URIS
);
oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

// Function to send email using OAuth2
async function sendMail({ emailTo, subject, text, cc, bcc, attachments }) {
    try {
        const ACCESS_TOKEN = await oAuth2Client.getAccessToken();

        const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.GMAIL_USER,
                clientId: process.env.CLIENT_ID,
                clientSecret: process.env.CLIENT_SECRET,
                refreshToken: process.env.REFRESH_TOKEN,
                accessToken: ACCESS_TOKEN,
            },
        });

        const mailOptions = {
            from: `"Nilesh" <${process.env.GMAIL_USER}>`,
            to: emailTo,
            subject: subject,
            text: text,
            attachments: attachments,
        };

        if (cc) {
            mailOptions.cc = cc;
        }

        if (bcc) {
            mailOptions.bcc = bcc;
        }

        const result = await transport.sendMail(mailOptions);
        return { status: true, result };
    } catch (err) {
        return { status: false, error: err.message };
    }
}

// Routes
app.post('/send-email', upload.single('resume'), async (req, res) => {
    const { recruiterName, emailTo, companyName, profile } = req.body;

    // Validate input fields
    if (!recruiterName || !emailTo || !companyName || !profile || !req.file) {
        return res.status(400).send('All fields are required, including a resume.');
    }

    const resumePath = req.file.path;

    const emailContent = `
        Hey ${recruiterName},

        I came across your job posting for the ${profile} position at ${companyName} and wanted to express my interest.

        With 2 years of experience in building dynamic web applications using ReactJS, I believe my skills could be a great fit for this position.

        Please find my resume attached for your review. I look forward to hearing from you.

        Thanks and Regards,
        Nilesh Prajapati
    `;

    const mailOptions = {
        emailTo,
        subject: `Application for ${profile} at ${companyName}`,
        text: emailContent,
        attachments: [
            {
                filename: req.file.originalname,
                path: resumePath,
            },
        ],
    };

    try {
        const emailResponse = await sendMail(mailOptions);
        if (emailResponse.status) {
            res.status(200).send('Email sent successfully');
        } else {
            console.error(emailResponse.error);
            res.status(500).send('Failed to send email. Please try again later.');
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Failed to send email. Please try again later.');
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
