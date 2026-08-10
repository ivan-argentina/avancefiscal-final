import Navbar from "./components/Navbar";
import Hero from "./sections/Hero";
import Features from "./sections/Features";
import Benefits from "./sections/Benefits";
import Pricing from "./sections/Pricing";
import Contact from "./sections/Contact";
import Footer from "./components/Footer";

export default function Landing() {
  return (
    <>
      <Navbar />
      <Hero />
      <Features />
      <Benefits />
      <Pricing />
      <Contact />
      <Footer />
    </>
  );
}
