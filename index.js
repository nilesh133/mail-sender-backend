const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

dotenv.config();
const app = express()
const PORT = process.env.PORT || 5000;

app.use(cors());
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

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});

// Routes
app.post('/send-email', upload.single('resume'), async (req, res) => {
    const { recruiterName, emailTo, companyName, profile } = req.body;

    // Validate input fields
    if (!recruiterName || !emailTo || !companyName || !profile || !req.file) {
        return res.status(400).send('All fields are required, including a resume.');
    }

    const resumePath = req.file.path;

    const mailOptions = {
        from: process.env.GMAIL_USER,
        to: emailTo,
        subject: `Application for ${profile} at ${companyName}`,
        text: `Hey ${recruiterName},

I came across your job posting for the ${profile} position at ${companyName} and wanted to express my interest.

With 2 years of experience in building dynamic web applications using ReactJS, I believe my skills could be a great fit for this position.

Please find my resume attached for your review. I look forward to hearing from you.

Thanks and Regards,
Nilesh Prajapati`,
        attachments: [
            {
                filename: req.file.originalname,
                path: resumePath,
            },
        ],
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).send('Email sent successfully');
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Failed to send email. Please try again later.');
    }
});

app.get("/", (req, res) => {
    res.send("Hello world");
})

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
