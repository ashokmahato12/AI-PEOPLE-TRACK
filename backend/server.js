import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import apiRouter from './routes/api.js';

const app = express();
const port = Number(process.env.PORT || 4000);

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '32kb' }));
app.use('/api', apiRouter);
app.use((error, _req, res, _next) => {
  console.error('Request failed:', error.message);
  res.status(500).json({ message: 'Unexpected server error.' });
});

app.listen(port, () => {
  console.log(`AI People Track API listening on http://localhost:${port}`);
  if (!process.env.JWT_SECRET || !process.env.ADMIN_EMAIL ||
      (!process.env.ADMIN_PASSWORD && !process.env.ADMIN_PASSWORD_HEX)) {
    console.warn('Set JWT_SECRET, ADMIN_EMAIL, and ADMIN_PASSWORD in backend/.env before signing in.');
  }
});