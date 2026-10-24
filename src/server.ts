import express, { NextFunction, Request, Response } from 'express';
import path from 'node:path';
import { createOrder, findOrder, listProducts, resetData } from './db';

const app = express();
const port = Number(process.env.PORT ?? 3000);
const publicDirectory = path.resolve(process.cwd(), 'public');

app.use(express.json());
app.use(express.static(publicDirectory));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/products', (_req, res) => res.json(listProducts()));

app.post('/api/test/reset', (_req, res) => {
  resetData();
  res.status(204).send();
});

app.post('/api/orders', (req, res, next) => {
  try {
    const result = createOrder(req.body?.items);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/api/orders/:id', (req, res) => {
  const order = findOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado.' });
  return res.json(order);
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(400).json({ error: error.message || 'No se pudo procesar la solicitud.' });
});

app.get('*', (_req, res) => res.sendFile(path.join(publicDirectory, 'index.html')));

app.listen(port, () => {
  console.log(`Cafetería disponible en http://localhost:${port}`);
});

