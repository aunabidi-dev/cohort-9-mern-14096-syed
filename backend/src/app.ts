import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config';
import routes from './routes';
import { notFound } from './middleware/notFound';

const app: Express = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());
app.use(helmet());

app.use('/api', routes);

app.use(notFound);

export default app;
