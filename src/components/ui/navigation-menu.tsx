"use client";

import * as React from "react";
import { motion, useScroll, useMotionValueEvent, type Variants } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Features", href: "#features" },
  { name: "About", href: "/about" },
  { name: "Join Waitlist", href: "#hero" },
];

const EXPAND_SCROLL_THRESHOLD = 80;

const containerVariants: Variants = {
  expanded: {
    y: 0,
    opacity: 1,
    width: "auto",
    transition: {
      y: { type: "spring", damping: 18, stiffness: 250 },
      opacity: { duration: 0.3 },
      type: "spring",
      damping: 20,
      stiffness: 300,
      staggerChildren: 0.07,
      delayChildren: 0.2,
    },
  },
  collapsed: {
    y: 0,
    opacity: 1,
    width: "3rem",
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 300,
      when: "afterChildren",
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

const logoVariants: Variants = {
  expanded: { opacity: 1, x: 0, rotate: 0, transition: { type: "spring", damping: 15 } },
  collapsed: { opacity: 0, x: -25, rotate: -180, transition: { duration: 0.3 } },
};

const brandVariants: Variants = {
  expanded: { opacity: 1, x: 0, transition: { type: "spring", damping: 15, delay: 0.05 } },
  collapsed: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

const itemVariants: Variants = {
  expanded: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", damping: 15 } },
  collapsed: { opacity: 0, x: -20, scale: 0.95, transition: { duration: 0.2 } },
};

const collapsedIconVariants: Variants = {
  expanded: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } },
  collapsed: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", damping: 15, stiffness: 300, delay: 0.15 },
  },
};

export function AnimatedNav() {
  const [isExpanded, setExpanded] = React.useState(true);
  const { scrollY } = useScroll();
  const lastScrollY = React.useRef(0);
  const scrollPositionOnCollapse = React.useRef(0);
  const navigate = useNavigate();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = lastScrollY.current;
    if (isExpanded && latest > previous && latest > 150) {
      setExpanded(false);
      scrollPositionOnCollapse.current = latest;
    } else if (!isExpanded && latest < previous && scrollPositionOnCollapse.current - latest > EXPAND_SCROLL_THRESHOLD) {
      setExpanded(true);
    }
    lastScrollY.current = latest;
  });

  const handleNavClick = (e: React.MouseEvent) => {
    if (!isExpanded) {
      e.preventDefault();
      setExpanded(true);
    }
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (href.startsWith("#")) {
      const target = document.querySelector(href);
      if (target) target.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(href);
    }
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-0.75rem)]">
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={isExpanded ? "expanded" : "collapsed"}
        variants={containerVariants}
        whileHover={!isExpanded ? { scale: 1.1 } : {}}
        whileTap={!isExpanded ? { scale: 0.95 } : {}}
        onClick={handleNavClick}
        className={cn(
          "flex items-center overflow-hidden rounded-full border border-slate-200 bg-white/90 shadow-sm shadow-slate-200 backdrop-blur-md h-12",
          !isExpanded && "cursor-pointer justify-center"
        )}
      >
        <motion.div
          variants={logoVariants}
          className="flex-shrink-0 flex items-center pl-3 pr-1 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); navigate("/"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        >
          <img src="/Aloud_logo.png" className="h-7 w-7 object-contain" alt="Aloud" />
        </motion.div>
        <motion.span
          variants={brandVariants}
          className="flex-shrink-0 font-bold text-slate-900 pr-2 tracking-tight cursor-pointer"
          onClick={(e) => { e.stopPropagation(); navigate("/"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        >
          Aloud
        </motion.span>

        <motion.div variants={itemVariants} className="w-px h-4 bg-slate-200 mr-1" />

        <motion.div
          className={cn(
            "flex items-center gap-0.5 pr-3",
            !isExpanded && "pointer-events-none"
          )}
        >
          {navItems.map((item) => (
            <motion.a
              key={item.name}
              href={item.href}
              variants={itemVariants}
              onClick={(e) => handleLinkClick(e, item.href)}
              className={cn(
                "text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-1.5 sm:px-2 py-1 rounded-full hover:bg-slate-100 whitespace-nowrap",
                item.name === "Features" && "hidden sm:block",
                item.name === "Join Waitlist" && "text-teal-600 hover:text-teal-700"
              )}
            >
              {item.name}
            </motion.a>
          ))}
        </motion.div>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div variants={collapsedIconVariants} animate={isExpanded ? "expanded" : "collapsed"}>
            <Menu className="h-5 w-5 text-slate-700" />
          </motion.div>
        </div>
      </motion.nav>
    </div>
  );
}
