-- CreateTable
CREATE TABLE "Camera" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "hostname" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "username" TEXT,
    "password" TEXT,
    "path" TEXT NOT NULL DEFAULT '/onvif/device_service',
    "useSecure" BOOLEAN NOT NULL DEFAULT false,
    "useWSSecurity" BOOLEAN NOT NULL DEFAULT false,
    "snapshotUri" TEXT,
    "streamUri" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Camera_hostname_idx" ON "Camera"("hostname");

-- CreateIndex
CREATE UNIQUE INDEX "Camera_hostname_port_key" ON "Camera"("hostname", "port");
