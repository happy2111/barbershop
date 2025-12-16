import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: ['http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const UPLOAD_PATH = '/var/www/barbershop_uploads';

  app.useStaticAssets(`${UPLOAD_PATH}/service`, { prefix: '/uploads/service' });
  app.useStaticAssets(`${UPLOAD_PATH}/specialist`, { prefix: '/uploads/specialist' });

  app.useStaticAssets('uploads', { prefix: '/uploads' });

  app.use(cookieParser());

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
