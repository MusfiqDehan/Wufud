import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { env } from "./shared/config/env";
import { setupSwagger } from "./shared/swagger/setup-swagger";
import { isAllowedWebOrigin } from "./shared/config/web-origin";
import { validationExceptionFactory } from "./shared/validation/validation.factory";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  // Legacy compat: rewrite unversioned `/api/...` -> `/api/v1/...`
  // (except docs + already-versioned). Lets old web/mobile clients keep working
  // while canonical routes are versioned, e.g. `POST /api/v1/auth/login`.
  app.use((req, _res, next) => {
    const raw: string = (req as { originalUrl?: string }).originalUrl ?? req.url ?? "";
    const path = raw.split("?")[0];
    if (
      path.startsWith("/api/") &&
      !path.startsWith("/api/v1/") &&
      !path.startsWith("/api/docs")
    ) {
      const query = raw.includes("?") ? raw.slice(raw.indexOf("?")) : "";
      req.url = `/api/v1/${path.slice("/api/".length)}${query}`;
    }
    next();
  });
  app.use(cookieParser());
  app.enableCors({
    origin: (origin, callback) => callback(null, isAllowedWebOrigin(origin)),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      exceptionFactory: validationExceptionFactory,
    }),
  );
  setupSwagger(app);
  await app.listen(env.API_PORT);
}

void bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
