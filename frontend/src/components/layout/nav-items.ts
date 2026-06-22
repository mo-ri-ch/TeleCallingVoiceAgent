import {
  Bot,
  Building2,
  Megaphone,
  PhoneCall,
  GraduationCap,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/companies",
    label: "Companies",
    icon: Building2,
    description: "Manage company profiles & knowledge bases",
  },
  {
    href: "/campaigns",
    label: "Campaigns",
    icon: Megaphone,
    description: "Outbound calling campaigns & lead lists",
  },
  {
    href: "/call-logs",
    label: "Call Logs",
    icon: PhoneCall,
    description: "Inbound & outbound call history",
  },
  {
    href: "/learning-studio",
    label: "Learning Studio",
    icon: GraduationCap,
    description: "Upload recordings & extract playbooks",
  },
  {
    href: "/rl-engine",
    label: "RL Engine",
    icon: Sparkles,
    description: "Policy performance & self-improvement",
  },
  {
    href: "/playground",
    label: "AI Playground",
    icon: Bot,
    description: "Chat with the AI agent persona & test RAG responses",
  },
];
