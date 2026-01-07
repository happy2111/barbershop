import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

BigInt.prototype.toJSON = function (this: bigint) {
  return this.toString();
};
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://www.romitan-barbershop.uz',
      'https://romitan-barbershop.uz',
    ],
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization, x-telegram-init-data',
    exposedHeaders: ['set-cookie'],
  });

  const UPLOAD_PATH = '/var/www/barbershop_uploads';

  app.useStaticAssets(`${UPLOAD_PATH}/service`, { prefix: '/uploads/service' });
  app.useStaticAssets(`${UPLOAD_PATH}/specialist`, {
    prefix: '/uploads/specialist',
  });

  app.useStaticAssets('uploads', { prefix: '/uploads' });

  app.use(cookieParser());

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(5000, '0.0.0.0');

  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
