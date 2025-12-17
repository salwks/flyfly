import { createClient } from "@supabase/supabase-js";

// 프론트엔드용 anon key (읽기 전용, 노출 OK)
export const supabase = createClient(
  "https://rnwysxxamizxzgisdcgj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJud3lzeHhhbWl6eHpnaXNkY2dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NzM0MjAsImV4cCI6MjA4MTU0OTQyMH0.02hh6b9Z8yPqm_BIGbFJY_apXlqrCNhdQHDgDuEqnlk"
);
