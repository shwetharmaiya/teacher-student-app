CREATE TYPE "attendance_status" AS ENUM ('PRESENT', 'ABSENT', 'LATE');
--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "teacher_id" uuid;
--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE TABLE "class_enrollments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "class_id" uuid NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE,
    "student_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "class_enrollments_class_student_unique" ON "class_enrollments" USING btree ("class_id", "student_id");
--> statement-breakpoint
CREATE TABLE "assignments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "class_id" uuid NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE,
    "teacher_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "title" varchar(160) NOT NULL,
    "description" varchar(1000),
    "due_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "class_id" uuid NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE,
    "student_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "attendance_date" varchar(10) NOT NULL,
    "status" "attendance_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_records_class_student_date_unique" ON "attendance_records" USING btree ("class_id", "student_id", "attendance_date");
