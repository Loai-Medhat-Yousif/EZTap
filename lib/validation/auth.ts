import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Enter your username")
    .max(64, "Username is too long"),
  password: z
    .string()
    .min(1, "Enter your password")
    .max(200, "Password is too long"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Enter your current password")
      .max(200, "Password is too long"),
    newPassword: z
      .string()
      .min(10, "Use at least 10 characters")
      .max(200, "Password is too long"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password you haven't used",
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
