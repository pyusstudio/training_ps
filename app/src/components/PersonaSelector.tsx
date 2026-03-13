import React from "react";
import { motion } from "framer-motion";
import { User, Shield, Zap, Sparkles } from "lucide-react";

export type PersonaId = "elena" | "ahmad" | "sarah" | "david";

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
    id: "ahmad",
    name: "Ahmad",
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
            className={`relative flex flex-col items-center p-4 rounded-2xl border transition-all duration-300 ${
              isSelected
                ? "bg-white/10 border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.1)] backdrop-blur-md"
                : "bg-black/20 border-white/5 hover:border-white/10 backdrop-blur-sm"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${persona.color} flex items-center justify-center mb-3 shadow-lg relative`}
            >
              {isSelected && (
                <motion.div
                  layoutId="indicator"
                  className="absolute -inset-1 rounded-[14px] border-2 border-white/50 blur-[2px]"
                />
              )}
              <div className="text-white drop-shadow-md">
                {persona.id === "elena" ? <Sparkles className="w-6 h-6" /> : 
                 persona.id === "ahmad" ? <Shield className="w-6 h-6" /> : 
                 persona.id === "sarah" ? <Zap className="w-6 h-6" /> : 
                 <User className="w-6 h-6" />}
              </div>
            </div>
            
            <span className={`text-[13px] font-black uppercase tracking-widest ${isSelected ? "text-white" : "text-slate-400"}`}>
              {persona.name}
            </span>
            <span className="text-[10px] text-slate-500 font-bold mt-1 text-center leading-tight">
              {persona.trait}
            </span>
            
            {isSelected && (
              <motion.div
                layoutId="active-glow"
                className="absolute inset-0 rounded-2xl bg-white/5 pointer-events-none"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
