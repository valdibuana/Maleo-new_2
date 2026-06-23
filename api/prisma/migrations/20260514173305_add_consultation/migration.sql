-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('unread', 'read', 'replied');

-- CreateTable
CREATE TABLE "consultations" (
    "id" SERIAL NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "receiver_id" INTEGER NOT NULL,
    "sender_role" "Role" NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'unread',
    "parent_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
