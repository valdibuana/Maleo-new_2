"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatestNotifications = void 0;
const prisma_1 = require("../lib/prisma");
const client_1 = require("@prisma/client");
/**
 * Mengambil maksimal 5 pengumuman terbaru berdasarkan role user login.
 */
const getLatestNotifications = async (req, res) => {
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
        let targets = [client_1.AnnouncementTarget.all];
        if (role === "student") {
            targets.push(client_1.AnnouncementTarget.student);
        }
        else if (role === "teacher" || role === "kepala_sekolah") {
            targets.push(client_1.AnnouncementTarget.teacher);
        }
        else if (role === "guardian") {
            targets.push(client_1.AnnouncementTarget.guardian);
        }
        else if (role === "admin") {
            targets.push(client_1.AnnouncementTarget.student, client_1.AnnouncementTarget.teacher, client_1.AnnouncementTarget.guardian);
        }
        const announcements = await prisma_1.prisma.announcement.findMany({
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
    }
    catch (error) {
        console.error("[GET_LATEST_NOTIFICATIONS_ERROR]", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getLatestNotifications = getLatestNotifications;
//# sourceMappingURL=notification.controller.js.map