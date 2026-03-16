import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { generateTokenPair } from "../utils/jwt";
import { generateOtp, isOtpExpired } from "../utils/helpers";

// ---- REGISTER WITH EMAIL ----
export const registerWithEmail = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, role = "PATIENT" } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw ApiError.conflict("Email already registered");

    const passwordHash = await bcrypt.hash(password, 12);
    const emailVerifyToken = generateOtp();

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        emailVerifyToken,
        ...(role === "PATIENT" && {
          patient: { create: { firstName, lastName } },
        }),
      },
      include: { patient: true },
    });

    const { passwordHash: _, emailVerifyToken: __, ...safeUser } = user as any;

    res
      .status(201)
      .json(
        ApiResponse.success(
          "Registration successful. Please verify your email.",
          safeUser,
        ),
      );
  },
);

// ---- REGISTER WITH PHONE ----
export const registerWithPhone = asyncHandler(
  async (req: Request, res: Response) => {
    const { phone, firstName, lastName } = req.body;

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) throw ApiError.conflict("Phone already registered");

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.user.create({
      data: {
        phone,
        role: "PATIENT",
        phoneOtp: otp,
        phoneOtpExpiresAt: otpExpiry,
        patient: { create: { firstName, lastName } },
      },
    });

    // TODO: sendSmsOtp(phone, otp)
    console.log(`OTP for ${phone}: ${otp}`);

    res.status(201).json(ApiResponse.success("OTP sent to your phone number."));
  },
);

// ---- VERIFY PHONE OTP ----
export const verifyPhoneOtp = asyncHandler(
  async (req: Request, res: Response) => {
    const { phone, otp } = req.body;

    const user = await prisma.user.findUnique({
      where: { phone },
      include: { patient: true },
    });

    if (!user) throw ApiError.notFound("User not found");
    if (user.phoneOtp !== otp) throw ApiError.badRequest("Invalid OTP");
    if (isOtpExpired(user.phoneOtpExpiresAt))
      throw ApiError.badRequest("OTP expired");

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isPhoneVerified: true,
        phoneOtp: null,
        phoneOtpExpiresAt: null,
        lastLoginAt: new Date(),
      },
      include: { patient: true },
    });

    const tokens = generateTokenPair({
      userId: user.id,
      role: user.role,
      phone: user.phone ?? undefined,
    });

    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { passwordHash, phoneOtp, ...safeUser } = updatedUser as any;
    res.json(
      ApiResponse.success("Phone verified and logged in.", {
        user: safeUser,
        accessToken: tokens.accessToken,
      }),
    );
  },
);

// ---- LOGIN WITH EMAIL ----
export const loginWithEmail = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { patient: true },
    });

    if (!user || !user.passwordHash)
      throw ApiError.unauthorized("Invalid credentials");
    if (!user.isActive) throw ApiError.unauthorized("Account is deactivated");

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw ApiError.unauthorized("Invalid credentials");

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = generateTokenPair({
      userId: user.id,
      role: user.role,
      email: user.email ?? undefined,
    });

    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const {
      passwordHash,
      emailVerifyToken,
      resetToken,
      resetTokenExpiry,
      phoneOtp,
      phoneOtpExpiresAt,
      ...safeUser
    } = user as any;

    res.json(
      ApiResponse.success("Login successful", {
        user: safeUser,
        accessToken: tokens.accessToken,
      }),
    );
  },
);

// ---- LOGIN WITH PHONE ----
export const loginWithPhone = asyncHandler(
  async (req: Request, res: Response) => {
    const { phone } = req.body;

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user)
      throw ApiError.notFound("No account found with this phone number");
    if (!user.isActive) throw ApiError.unauthorized("Account is deactivated");

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { phoneOtp: otp, phoneOtpExpiresAt: otpExpiry },
    });

    // TODO: sendSmsOtp(phone, otp)
    console.log(`OTP for ${phone}: ${otp}`);

    res.json(ApiResponse.success("OTP sent to your phone number."));
  },
);

// ---- REFRESH TOKEN ----
export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const { verifyRefreshToken } = await import("../utils/jwt");

    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (!token) throw ApiError.unauthorized("Refresh token missing");

    const decoded = verifyRefreshToken(token);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
    });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw ApiError.unauthorized("Refresh token expired or invalid");
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });
    if (!user || !user.isActive)
      throw ApiError.unauthorized("User not found or inactive");

    // Rotate refresh token
    await prisma.refreshToken.delete({ where: { token } });

    const tokens = generateTokenPair({
      userId: user.id,
      role: user.role,
    });

    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json(
      ApiResponse.success("Token refreshed", {
        accessToken: tokens.accessToken,
      }),
    );
  },
);

// ---- LOGOUT ----
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;
  if (token) {
    await prisma.refreshToken.deleteMany({ where: { token } }).catch(() => {});
  }
  res.clearCookie("refreshToken");
  res.json(ApiResponse.success("Logged out successfully"));
});

// ---- FORGOT PASSWORD ----
export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.json(
        ApiResponse.success("If this email exists, a reset OTP has been sent."),
      );
      return;
    }

    const resetToken = generateOtp(6);
    const resetExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry: resetExpiry },
    });

    // TODO: sendEmail(email, resetToken)
    console.log(`Reset OTP for ${email}: ${resetToken}`);

    res.json(
      ApiResponse.success("If this email exists, a reset OTP has been sent."),
    );
  },
);

// ---- RESET PASSWORD ----
export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, otp, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.resetToken !== otp)
      throw ApiError.badRequest("Invalid OTP");
    if (isOtpExpired(user.resetTokenExpiry))
      throw ApiError.badRequest("OTP expired");

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.json(ApiResponse.success("Password reset successfully"));
  },
);

// ---- GET ME ----
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { patient: true },
  });

  if (!user) throw ApiError.notFound("User not found");

  const {
  passwordHash,
  phoneOtp,
  phoneOtpExpiresAt,
  resetToken,
  resetTokenExpiry,
  emailVerifyToken,
  ...safeUser
} = user as any

  res.json(ApiResponse.success("Profile fetched", safeUser));
});
