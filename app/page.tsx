import SideScrollerGame from "./components/SideScrollerGame";

export default function Home() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-black relative">
      {/* Doom-style border frame */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {/* Top border */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black to-transparent opacity-80" />
        {/* Bottom border */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-black to-transparent opacity-80" />
        {/* Left border */}
        <div className="absolute top-0 left-0 bottom-0 w-2 bg-gradient-to-r from-black to-transparent opacity-80" />
        {/* Right border */}
        <div className="absolute top-0 right-0 bottom-0 w-2 bg-gradient-to-l from-black to-transparent opacity-80" />
        
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-red-900 opacity-60" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-red-900 opacity-60" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-red-900 opacity-60" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-red-900 opacity-60" />
      </div>
      
      {/* Game canvas */}
      <SideScrollerGame />
    </div>
  );
}
