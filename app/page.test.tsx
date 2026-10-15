import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";

test("home page renders the product name and status", () => {
  render(<Home />);
  expect(
    screen.getByRole("heading", { level: 1, name: "혼식당" }),
  ).toBeDefined();
  expect(screen.getByRole("status").textContent).toContain("준비");
});
