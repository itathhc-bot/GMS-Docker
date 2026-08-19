import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PasswordChecklist, scorePassword } from "@/components/users/PasswordChecklist";

describe("PasswordChecklist", () => {
  it("starts empty with all rules failing", () => {
    render(<PasswordChecklist password="" />);
    expect(screen.getByText(/Start typing/i)).toBeInTheDocument();
    const failed = document.querySelectorAll('[data-rule][data-passed="false"]');
    expect(failed.length).toBe(7);
  });

  it("marks rules as passed as the user types a stronger password", () => {
    const { rerender } = render(<PasswordChecklist password="abc" />);
    expect(document.querySelector('[data-rule="lower"]')?.getAttribute("data-passed")).toBe("true");
    expect(document.querySelector('[data-rule="length"]')?.getAttribute("data-passed")).toBe("false");

    rerender(<PasswordChecklist password="Munic!Fleet-2026#Spring" />);
    const passed = document.querySelectorAll('[data-passed="true"]');
    expect(passed.length).toBeGreaterThanOrEqual(6);
  });

  it("fails the noPersonal rule when the password contains the user's name", () => {
    render(<PasswordChecklist password="Nayeem-2026!Aaa" forbiddenTerms={["Nayeem", "nayeem@muncipality.ae"]} />);
    expect(document.querySelector('[data-rule="noPersonal"]')?.getAttribute("data-passed")).toBe("false");
  });

  it("fails the noCommon rule for known weak passwords and sequences", () => {
    render(<PasswordChecklist password="Password123!" />);
    expect(document.querySelector('[data-rule="noCommon"]')?.getAttribute("data-passed")).toBe("false");
  });

  it("exposes progressbar a11y attributes", () => {
    render(<PasswordChecklist password="Aa1!aaaa" />);
    const bar = screen.getByRole("progressbar", { name: /Password strength/i });
    expect(bar).toHaveAttribute("aria-valuemax", "7");
    expect(Number(bar.getAttribute("aria-valuenow"))).toBeGreaterThan(0);
  });

  it("scorePassword grades strong passphrases as strong", () => {
    const result = scorePassword("Munic!Fleet-2026#Spring");
    expect(result.label).toBe("strong");
    expect(result.passed).toBe(result.total);
  });
});
