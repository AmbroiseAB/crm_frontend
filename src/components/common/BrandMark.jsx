import logo from "../../assets/infonova-logo.svg";
import lightLogo from "../../assets/infonova-logo-light.svg";
import mark from "../../assets/infonova-mark.svg";
import lightMark from "../../assets/infonova-mark-light.svg";

export function BrandMark({ className = "h-9 w-auto", light = false, compact = false }) {
  if (!compact) {
    return <img src={light ? lightLogo : logo} alt="InfoNova CRM" className={className} />;
  }

  return (
    <>
      <img src={light ? lightMark : mark} alt="InfoNova CRM" className={`h-9 w-9 sm:hidden ${className}`} />
      <img src={light ? lightLogo : logo} alt="InfoNova CRM" className={`hidden sm:block ${className}`} />
    </>
  );
}