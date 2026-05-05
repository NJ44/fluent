import * as React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProjectCardProps extends React.HTMLAttributes<HTMLDivElement> {
  imgSrc: string;
  title: string;
  description: string;
  link: string;
  linkText?: string;
}

const ProjectCard = React.forwardRef<HTMLDivElement, ProjectCardProps>(
  ({ className, imgSrc, title, description, link, linkText = "Learn More", ...props }, ref) => {
    const isExternal = !link.startsWith("#") && !link.startsWith("/");

    const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.stopPropagation();
      if (link.startsWith("#")) {
        e.preventDefault();
        document.querySelector(link)?.scrollIntoView({ behavior: "smooth" });
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          "group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] text-white shadow-sm transition-all duration-500 ease-in-out hover:-translate-y-2 hover:shadow-xl hover:border-teal-500/30 hover:bg-white/[0.06]",
          className
        )}
        {...props}
      >
        <div className="aspect-video overflow-hidden">
          <img
            src={imgSrc}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
            loading="lazy"
          />
        </div>

        <div className="flex flex-1 flex-col p-6">
          <h3 className="text-xl font-semibold transition-colors duration-300 group-hover:text-teal-400">
            {title}
          </h3>
          <p className="mt-3 flex-1 text-gray-400">{description}</p>

          <a
            href={link}
            {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            onClick={handleLinkClick}
            className="group/button mt-4 inline-flex items-center gap-2 text-sm font-medium text-teal-400 transition-all duration-300 hover:underline"
          >
            {linkText}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/button:translate-x-1" />
          </a>
        </div>
      </div>
    );
  }
);
ProjectCard.displayName = "ProjectCard";

export { ProjectCard };
