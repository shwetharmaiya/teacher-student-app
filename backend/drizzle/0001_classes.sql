CREATE TABLE "classes" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "grade" varchar(64) NOT NULL,
    "section" varchar(3) NOT NULL,
    "teacher_name" varchar(120),
    "room" varchar(32) NOT NULL,
    "capacity" integer NOT NULL,
    "student_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "classes_grade_section_unique" ON "classes" USING btree ("grade", "section");
