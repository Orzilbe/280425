import Link from "next/link";

const NavigationButton = ({ href, icon }) => (
  <Link 
    href={href} 
    className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center hover:shadow-xl transform hover:scale-105 transition-all duration-300"
  >
    <span className="text-2xl">{icon}</span>
  </Link>
);

export default NavigationButton;
