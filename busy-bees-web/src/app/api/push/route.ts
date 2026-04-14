import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { targetUserId, targetUserIds, senderName, messageText, roomId } = body;

        let targets: string[] = [];
        if (targetUserIds && Array.isArray(targetUserIds) && targetUserIds.length > 0) {
            targets = targetUserIds;
        } else if (targetUserId) {
            targets = [targetUserId];
        }

        if (targets.length === 0) {
            return NextResponse.json({ error: 'Missing target user ID' }, { status: 400 });
        }

        const raw = JSON.stringify({
            "app_id": "ea0664ea-ce09-4464-9323-a668ac07e475",
            "include_aliases": { "external_id": targets },
            "target_channel": "push",
            "headings": { "en": "New message from " + (senderName || 'A User') },
            "contents": { "en": messageText || 'Sent a message' },
            "data": { "roomId": roomId },
            "ios_badgeType": "Increase",
            "ios_badgeCount": 1
        });

        const resp = await fetch("https://onesignal.com/api/v1/notifications", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": "Basic os_v2_app_5idgj2wobfcgjezduzukyb7eow4zoww7y6ounqfayh4yjdlznzvu73o4htvntlx22jet4o4qloppjlde2wu3dcocta2mqnms3wgecxi"
            },
            body: raw
        });

        const data = await resp.json();
        return NextResponse.json({ success: true, onesignal_response: data });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
