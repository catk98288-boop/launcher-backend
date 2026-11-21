const express = require('express');
const app = express();
app.use(express.json());

// ค่าเริ่มต้น (เปลี่ยน PlaceId เป็นของคุณเอง)
let currentServer = {
    placeId: "91719580047904", // <-- เปลี่ยนเป็น PlaceId ของแมพคุณ
    jobId: "2433ddc9-f24f-4906-9d42-f3c54a86cdbe"              // ค่านี้จะถูกอัปเดตจากเกม Roblox อัตโนมัติ
};

// 1. Endpoint สำหรับให้เกม Roblox ส่ง JobId เข้ามาอัปเดต
app.post('/api/update-server', (req, res) => {
    const { secretKey, placeId, jobId } = req.body;
    
    // คีย์ลับป้องกันคนอื่นมายิง API เล่น (ต้องตรงกับใน Roblox Script)
    if (secretKey !== "MY_SUPER_SECRET_KEY_12345") {
        return res.status(403).json({ error: "Unauthorized" });
    }

    currentServer.placeId = placeId;
    currentServer.jobId = jobId;
    
    console.log(`[Updated] JobId ล่าสุดคือ: ${jobId}`);
    res.json({ success: true });
});

// 2. Endpoint สำหรับให้ Python Launcher ของผู้เล่นเข้ามาหยิบข้อมูลไปเปิดเกม
app.get('/api/get-latest-server', (req, res) => {
    res.json(currentServer);
});

// รันเซิร์ฟเวอร์
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});
