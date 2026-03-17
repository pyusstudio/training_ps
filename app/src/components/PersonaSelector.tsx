import React from "react";
import { motion } from "framer-motion";
import { User, Shield, Zap, Sparkles } from "lucide-react";

export type PersonaId = "elena" | "robert" | "sarah" | "david";

interface Persona {
  id: PersonaId;
  name: string;
  gender: string;
  trait: string;
  icon: React.ReactNode;
  color: string;
}

const PERSONAS: Persona[] = [
  {
    id: "elena",
    name: "Elena",
    gender: "Female",
    trait: "Design Connoisseur",
    icon: <Sparkles className="w-5 h-5" />,
    color: "from-pink-500 to-rose-600",
  },
  {
    id: "robert",
    name: "Robert",
    gender: "Male",
    trait: "Decisive Executive",
    icon: <Shield className="w-5 h-5" />,
    color: "from-blue-500 to-indigo-600",
  },
  {
    id: "sarah",
    name: "Sarah",
    gender: "Female",
    trait: "Eco-Conscious",
    icon: <Zap className="w-5 h-5" />,
    color: "from-emerald-400 to-teal-500",
  },
  {
    id: "david",
    name: "David",
    gender: "Male",
    trait: "Protective Father",
    icon: <User className="w-5 h-5" />,
    color: "from-amber-400 to-orange-500",
  },
];

interface PersonaSelectorProps {
  selectedId: PersonaId;
  onSelect: (id: PersonaId) => void;
  disabled?: boolean;
}

export function PersonaSelector({ selectedId, onSelect, disabled }: PersonaSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl mx-auto mb-8">
      {PERSONAS.map((persona) => {
        const isSelected = selectedId === persona.id;
        return (
          <motion.button
            key={persona.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(persona.id)}
            whileHover={!disabled ? { y: -4, scale: 1.02 } : {}}
            whileTap={!disabled ? { scale: 0.98 } : {}}
            className={`relative flex flex-col items-center p-6 rounded-[2rem] border transition-all duration-500 ${
              isSelected
                ? "bg-violet-600/10 border-violet-500/40 shadow-[0_0_30px_rgba(124,58,237,0.1)] backdrop-blur-xl"
                : "bg-white/[0.03] border-white/5 hover:border-white/10 backdrop-blur-md"
            } ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${persona.color} flex items-center justify-center mb-4 shadow-2xl relative transition-transform duration-500 ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`}
            >
              {isSelected && (
                <motion.div
                  layoutId="indicator"
                  className="absolute -inset-1.5 rounded-[1.2rem] border-2 border-violet-400/50 blur-[1px]"
                />
              )}
              <div className="text-white drop-shadow-2xl">
                {persona.id === "elena" ? <Sparkles className="w-7 h-7" /> : 
                 persona.id === "robert" ? <Shield className="w-7 h-7" /> : 
                 persona.id === "sarah" ? <Zap className="w-7 h-7" /> : 
                 <User className="w-7 h-7" />}
              </div>
            </div>
            
            <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${isSelected ? "text-white" : "text-slate-500"}`}>
              {persona.name}
            </span>
            <span className="text-[9px] text-slate-600 font-black uppercase tracking-tighter mt-1 text-center leading-tight opacity-80">
              {persona.trait}
            </span>
            
            {isSelected && (
              <motion.div
                layoutId="active-glow"
                className="absolute inset-0 rounded-[2rem] bg-violet-600/5 pointer-events-none"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
