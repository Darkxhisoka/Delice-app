// Temporarily enabled console window for troubleshooting production build issues
// #![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  app_lib::run();
}
