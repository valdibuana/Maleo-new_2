import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { Role } from "@prisma/client";

/**
 * Mendapatkan semua user (Admin only)
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      data: users,
      total: users.length,
    });
  } catch (error) {
    console.error("[UserController] getAllUsers error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server saat mengambil data pengguna.",
    });
  }
};

/**
 * Menambahkan pengguna baru (Admin only)
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, nipNis } = req.body;

    // Cek apakah email sudah terdaftar (jika ada)
    if (email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        res.status(400).json({ success: false, message: "Email sudah terdaftar." });
        return;
      }
    }

    // Cek apakah NIP/NIS sudah terdaftar (jika ada)
    if (nipNis) {
      const existingNip = await prisma.user.findUnique({ where: { nipNis } });
      if (existingNip) {
        res.status(400).json({ success: false, message: "NIP/NIS sudah terdaftar." });
        return;
      }
    }

    // Validasi role (opsional, tapi baik untuk keamanan)
    const validRoles = Object.values(Role);
    if (!validRoles.includes(role)) {
      res.status(400).json({
        success: false,
        message: `Role tidak valid. Pilih salah satu dari: ${validRoles.join(", ")}`,
      });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Simpan user baru
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        nipNis,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        nipNis: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Pengguna berhasil ditambahkan.",
      data: newUser,
    });
  } catch (error) {
    console.error("[UserController] createUser error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server saat menambahkan pengguna.",
    });
  }
};

/**
 * Mengubah data pengguna berdasarkan ID (Admin only)
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, nipNis } = req.body;

    // Cek apakah user exists
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
    });

    if (!user) {
      res.status(404).json({ success: false, message: "Pengguna tidak ditemukan." });
      return;
    }

    // Email check
    if (email && email !== user.email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        res.status(400).json({ success: false, message: "Email sudah digunakan." });
        return;
      }
    }

    // NIP/NIS check
    if (nipNis && nipNis !== user.nipNis) {
      const existingNip = await prisma.user.findUnique({ where: { nipNis } });
      if (existingNip) {
        res.status(400).json({ success: false, message: "NIP/NIS sudah digunakan." });
        return;
      }
    }

    // Data yang akan diupdate (hanya yang dikirim)
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (nipNis !== undefined) updateData.nipNis = nipNis;

    // Jika password diisi, hash password baru
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        nipNis: true,
        role: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Data pengguna berhasil diperbarui.",
      data: updatedUser,
    });
  } catch (error) {
    console.error("[UserController] updateUser error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server saat memperbarui data pengguna.",
    });
  }
};

/**
 * Menghapus pengguna berdasarkan ID (Admin only)
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Cek apakah user exists
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan.",
      });
      return;
    }

    // Jangan biarkan admin menghapus dirinya sendiri secara tidak sengaja (opsional tapi disarankan)
    // if (req.user?.id === Number(id)) {
    //   return res.status(400).json({ success: false, message: "Tidak dapat menghapus akun Anda sendiri." });
    // }

    await prisma.user.delete({
      where: { id: Number(id) },
    });

    res.status(200).json({
      success: true,
      message: "Pengguna berhasil dihapus.",
    });
  } catch (error) {
    console.error("[UserController] deleteUser error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server saat menghapus pengguna.",
    });
  }
};
