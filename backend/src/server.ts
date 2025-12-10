// src/server.ts
import express from 'express';
import cors from 'cors';
import intentRoutes from './routes/intent.routes';
import solverRoutes from './routes/solver.routes';
import rewardsRoutes from './routes/rewards.routes';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/intent', intentRoutes);
app.use('/api/solver', solverRoutes);
app.use('/api/rewards', rewardsRoutes);

app.get('/', (req, res) => res.json({ status: 'Portal Backend Live' }));

export default app;