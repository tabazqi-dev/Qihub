import serverless from 'serverless-http';
import app from '../../src/server/app.ts';

const handlerFn = serverless(app);

export const handler = async (event: Record<string, any>, context: Record<string, any>) => {
  if (typeof event?.path === 'string' && event.path.startsWith('/.netlify/functions/api')) {
    event.path = '/api' + event.path.slice('/.netlify/functions/api'.length);
  }
  return handlerFn(event, context);
};
