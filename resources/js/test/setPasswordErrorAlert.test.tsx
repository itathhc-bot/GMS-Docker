import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useState } from "react";
import {
  SetPasswordErrorAlert,
  isWeakPasswordError,
} from "@/components/users/SetPasswordErrorAlert";
import * as usersApi from "@/api/users";

// Mock the users API setPassword function
vi.mock("@/api/users", () => ({
  setPassword: vi.fn(),
  getUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deactivate: vi.fn(),
  reactivate: vi.fn(),
  assignRole: vi.fn(),
  removeRole: vi.fn(),
  sendPasswordReset: vi.fn(),
}));

const setPasswordMock = vi.mocked(usersApi.setPassword);

describe("isWeakPasswordError", () => {
  it("detects HIBP / weak / breach phrasing", () => {
    expect(isWeakPasswordError("Password is known to be weak and easy to guess, please choose a different one.")).toBe(true);
    expect(isWeakPasswordError("password has been pwned")).toBe(true);
    expect(isWeakPasswordError("found in a data breach")).toBe(true);
    expect(isWeakPasswordError("credential compromised")).toBe(true);
  });
  it("returns false for unrelated errors and empty input", () => {
    expect(isWeakPasswordError("")).toBe(false);
    expect(isWeakPasswordError(null)).toBe(false);
    expect(isWeakPasswordError("Forbidden: admin role required")).toBe(false);
  });
});

describe("SetPasswordErrorAlert rendering", () => {
  it("renders the destructive HIBP alert with title, description and 4 next-step tips", () => {
    render(
      <SetPasswordErrorAlert message="Password is known to be weak and easy to guess, please choose a different one." />
    );
    const alert = screen.getByTestId("set-pw-error");
    expect(alert).toBeInTheDocument();
    expect(alert.getAttribute("role")).toBe("alert");
    expect(alert.className).toMatch(/destructive/);
    expect(screen.getByText(/found in a data breach/i)).toBeInTheDocument();
    expect(screen.getByText(/leaked-password protection \(HIBP\)/i)).toBeInTheDocument();
    const tips = screen.getByTestId("set-pw-error-tips");
    expect(tips.querySelectorAll("li").length).toBe(4);
    expect(tips.textContent).toMatch(/12\+ characters/);
    expect(tips.textContent).toMatch(/passphrase/);
  });

  it("renders a generic rejected title and no tips for non-HIBP errors", () => {
    render(<SetPasswordErrorAlert message="Forbidden: admin role required" />);
    expect(screen.getByText(/Couldn't set password/i)).toBeInTheDocument();
    expect(screen.getByText(/Forbidden: admin role required/)).toBeInTheDocument();
    expect(screen.queryByTestId("set-pw-error-tips")).not.toBeInTheDocument();
  });
});

// Minimal harness replicating the submit/error flow for the new Laravel API
function Harness() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ weak: boolean; message: string } | null>(null);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      await usersApi.setPassword("user-1", pw);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (e instanceof Error ? e.message : "Unknown error");
      if (msg) setErr({ weak: isWeakPasswordError(msg), message: msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <input
        aria-label="password"
        value={pw}
        onChange={(e) => { setPw(e.target.value); if (err) setErr(null); }}
      />
      <button onClick={submit} disabled={busy}>Save</button>
      {err && <SetPasswordErrorAlert message={err.message} weak={err.weak} />}
    </div>
  );
}

describe("set password flow with weak-password response", () => {
  beforeEach(() => setPasswordMock.mockReset());

  it("shows the inline destructive alert + tips when the API returns a HIBP error", async () => {
    setPasswordMock.mockRejectedValueOnce({
      response: { data: { message: "Password is known to be weak and easy to guess, please choose a different one." } },
    });

    render(<Harness />);
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(screen.getByTestId("set-pw-error")).toBeInTheDocument());
    expect(screen.getByText(/found in a data breach/i)).toBeInTheDocument();
    expect(screen.getByTestId("set-pw-error-tips").querySelectorAll("li").length).toBe(4);
  });

  it("clears the alert when the user edits the password again", async () => {
    setPasswordMock.mockRejectedValueOnce({
      response: { data: { message: "Password is known to be weak and easy to guess." } },
    });
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "weakpass" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(screen.getByTestId("set-pw-error")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("password"), { target: { value: "Munic!Fleet-2026#Spring" } });
    expect(screen.queryByTestId("set-pw-error")).not.toBeInTheDocument();
  });

  it("shows non-HIBP errors verbatim without tips", async () => {
    setPasswordMock.mockRejectedValueOnce({
      response: { data: { message: "Target user not found" } },
    });
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "anything" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(screen.getByText(/Target user not found/)).toBeInTheDocument());
    expect(screen.queryByTestId("set-pw-error-tips")).not.toBeInTheDocument();
  });
});
