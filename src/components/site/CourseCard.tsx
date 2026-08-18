import { Link } from "@tanstack/react-router";
import { BookOpen, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type CourseCardData = {
  id: string;
  title: string;
  subject: string;
  stage: string;
  track: string | null;
  edu_type: string;
  price: number;
  is_free: boolean;
  cover_url: string | null;
  teachers?: { name: string; slug: string } | null;
};

export function CourseCard({ course }: { course: CourseCardData }) {
  return (
    <Link
      to="/courses/$courseId"
      params={{ courseId: course.id }}
      className="group flex flex-col overflow-hidden rounded-2xl card-soft transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-primary-soft">
        {course.cover_url ? (
          <img
            src={course.cover_url}
            alt={`غلاف كورس ${course.title}`}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-primary">
            <BookOpen className="size-10" />
          </div>
        )}
        <span className="absolute top-3 right-3">
          {course.is_free ? (
            <Badge className="bg-success text-white">مجاني</Badge>
          ) : (
            <Badge variant="secondary">{course.price} ج.م</Badge>
          )}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-bold leading-snug group-hover:text-primary">{course.title}</h3>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="size-3.5" />
          {course.teachers?.name ?? "المنصة"}
        </p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
          <Badge variant="outline">{course.subject}</Badge>
          <Badge variant="outline">{course.stage}</Badge>
          {course.track && <Badge variant="outline">{course.track}</Badge>}
          <Badge variant="outline">{course.edu_type}</Badge>
        </div>
      </div>
    </Link>
  );
}
