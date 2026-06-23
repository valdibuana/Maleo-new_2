import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { AnnouncementTarget } from "@prisma/client";

/**
 * Mengambil maksimal 5 pengumuman terbaru berdasarkan role user login.
 */
export const getLatestNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { role } = user;

    // Logic filtering berdasarkan role
    let targets: AnnouncementTarget[] = [AnnouncementTarget.all];

    if (role === "student") {
      targets.push(AnnouncementTarget.student);
    } else if (role === "teacher" || role === "kepala_sekolah") {
      targets.push(AnnouncementTarget.teacher);
    } else if (role === "guardian") {
      targets.push(AnnouncementTarget.guardian);
    } else if (role === "admin") {
      targets.push(AnnouncementTarget.student, AnnouncementTarget.teacher, AnnouncementTarget.guardian);
    }

    const announcements = await prisma.announcement.findMany({
      where: {
        isPublished: true,
        target: {
          in: targets,
        },
      },
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        content: true,
        priority: true,
        target: true,
        createdAt: true,
      },
    });

    // Batasi isi preview maksimal 80 karakter
    const formattedAnnouncements = announcements.map((item) => ({
      ...item,
      content: item.content.length > 80 ? item.content.substring(0, 80) + "..." : item.content,
    }));

    return res.status(200).json({
      success: true,
      data: formattedAnnouncements,
    });
  } catch (error) {
    console.error("[GET_LATEST_NOTIFICATIONS_ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
