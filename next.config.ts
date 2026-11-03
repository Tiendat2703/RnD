import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The on-screen route indicator is a dev-only affordance, and on this project
  // it sits exactly where the dashboard's own bottom-left surfaces live (the
  // credit card and the user row in the rail), so it also pollutes every
  // screenshot the shot suites take. Compile and runtime errors still surface.
  devIndicators: false,
};

export default nextConfig;
