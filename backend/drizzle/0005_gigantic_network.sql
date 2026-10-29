CREATE TABLE "parent_student_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "parent_student_links" ADD CONSTRAINT "parent_student_links_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_student_links" ADD CONSTRAINT "parent_student_links_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_student_links" ADD CONSTRAINT "parent_student_links_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "parent_student_links_pair_unique" ON "parent_student_links" USING btree ("parent_id","student_id");--> statement-breakpoint
CREATE INDEX "parent_student_links_parent_idx" ON "parent_student_links" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "parent_student_links_student_idx" ON "parent_student_links" USING btree ("student_id");