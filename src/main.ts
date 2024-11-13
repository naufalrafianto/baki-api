import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as process from 'process';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      cors: true,
      logger: ['error', 'warn', 'debug', 'log'],
    });

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3000);

    // Security middleware
    app.use(helmet());

    // CORS configuration
    app.enableCors({
      origin: configService.get('CORS_ORIGINS', '*'),
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });

    // Validation pipe for DTOs
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Swagger configuration
    const config = new DocumentBuilder()
      .setTitle('Fitness Exercise API')
      .setDescription('The Fitness Exercise API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth')
      .addTag('exercises')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    // Response transformation
    app.useGlobalInterceptors(new ResponseInterceptor());

    // Error handling
    app.useGlobalFilters(new GlobalExceptionFilter());

    // Start server with timeout handling
    const server = await app.listen(port);
    server.setTimeout(60000); // 60 seconds timeout

    console.log(`Application is running on: ${await app.getUrl()}`);
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
