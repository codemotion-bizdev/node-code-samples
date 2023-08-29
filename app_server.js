import qsParser from 'koa-qs';

import { config } from '@common/libs/config.manager';

import KoaApp from '@common/libs/KoaApp';
import * as S3Client from '@common/libs/s3';
import middlewares from '@common/middlewares';
import apiRouter from './router';

const host = config.get('API_HOST');
const port = config.get('API_PORT');

const app = new KoaApp(host, port);
qsParser(app);

for (const middleware of middlewares) {
  middleware.init(app, apiRouter);
}

S3Client.init();
app.use(apiRouter.routes());

export default app;
