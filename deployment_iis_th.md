# คู่มือการ Deploy โปรเจกต์ Node.js บน Windows IIS

คู่มือนี้จะอธิบายวิธีการนำโปรเจกต์ Node.js (อย่างเช่น ระบบประชาสัมพันธ์โรงพยาบาลนี้) ขึ้นใช้งานบน Windows Server โดยใช้ **IIS (Internet Information Services)** และ **iisnode**

---

## 1. สิ่งที่ต้องเตรียม (Prerequisites)

ก่อนเริ่มติดตั้ง ตรวจสอบให้แน่ใจว่า Server ของคุณ (Windows 10/11 หรือ Windows Server 2016/2019/2022) มีสิ่งเหล่านี้:

1.  **Node.js**: ติดตั้งเวอร์ชัน LTS (เช่น v18 หรือ v20) ดาวน์โหลดได้ที่ [nodejs.org](https://nodejs.org/)
2.  **IIS (Internet Information Services)**:
    *   ไปที่ *Turn Windows features on or off* (หรือ Server Manager > Add Roles and Features)
    *   เลือกเปิดใช้งาน **Internet Information Services**
3.  **URL Rewrite Module**: จำเป็นสำหรับให้ IIS เข้าใจ URL ของ Node.js
    *   ดาวน์โหลดและติดตั้งจาก: [IIS URL Rewrite](https://www.iis.net/downloads/microsoft/url-rewrite)
4.  **iisnode**: โมดูลเชื่อมต่อระหว่าง IIS และ Node.js
    *   ดาวน์โหลดและติดตั้งจาก: [iisnode releases](https://github.com/azure/iisnode/releases) (เลือก x64 หากใช้ Windows 64-bit)

---

## 2. การเตรียมไฟล์โปรเจกต์

1.  นำไฟล์โปรเจกต์ทั้งหมด (รวมถึงโฟลเดอร์ `node_modules`) ไปวางไว้ใน Server
    *   แนะนำให้วางไว้ที่ `C:\inetpub\wwwroot\hospital_news` หรือ Drive อื่นที่กำหนดสิทธิ์ได้ง่าย
2.  สร้างไฟล์ชื่อ `web.config` ไว้ที่ **Root Directory** ของโปรเจกต์ (ที่เดียวกับ `app.js`)
3.  copy โค้ดด้านล่างไปใส่ใน `web.config`:

```xml
<configuration>
  <system.webServer>
    <!-- ระบุไฟล์เริ่มต้น เป็น app.js -->
    <handlers>
      <add name="iisnode" path="app.js" verb="*" modules="iisnode" />
    </handlers>
    
    <rewrite>
      <rules>
        <!-- ตั้งค่าให้ Node.js จัดการ request ทั้งหมด -->
        <rule name="NodeInspector" patternSyntax="ECMAScript" stopProcessing="true">
          <match url="^app.js\/debug[\/]?" />
        </rule>

        <rule name="StaticContent">
          <action type="Rewrite" url="public{REQUEST_URI}" />
        </rule>

        <rule name="DynamicContent">
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="True" />
          </conditions>
          <action type="Rewrite" url="app.js" />
        </rule>
      </rules>
    </rewrite>
    
    <!-- ปิดการแจ้งเตือน Error ละเอียด เพื่อความปลอดภัย (เปิดได้ตอนแก้บั๊ก) -->
    <httpErrors existingResponse="PassThrough" />
    
    <!-- ตั้งค่าความปลอดภัย requestFiltering -->
    <security>
      <requestFiltering>
        <hiddenSegments>
          <add segment="node_modules" />
          <add segment=".env" />
        </hiddenSegments>
      </requestFiltering>
    </security>
  </system.webServer>
</configuration>
```

---

## 3. การตั้งค่าใน IIS Manager

1.  เปิดโปรแกรม **IIS Manager**
2.  คลิกขวาที่ **Sites** > **Add Website...**
3.  กรอกข้อมูลดังนี้:
    *   **Site name**: ชื่อเว็บไซต์ (เช่น `HospitalNews`)
    *   **Physical path**: เลือกโฟลเดอร์โปรเจกต์ที่เราวางไว้ (เช่น `C:\inetpub\wwwroot\hospital_news`)
    *   **Port**: พอร์ตที่ต้องการให้เข้าถึง (เช่น 80 หรือ 8080) *ระวังอย่าให้ชนกับ Port ของ app.js ที่เขียนในโค้ด แต่ปกติ iisnode จะจัดการให้เอง ผ่าน Named Pipe* (ควรใช้ Port ที่ว่าง)
    *   **Host name**: ปล่อยว่างไว้ หรือใส่ Domain Name ถ้ามี
4.  กด **OK**

---

## 4. การจัดการ Database (MySQL)

เนื่องจากโปรเจกต์นี้ใช้ MySQL:
1.  ต้องติดตั้ง MySQL Server บนเครื่อง Windows นี้ หรือเครื่องอื่นที่ Server มองเห็น
2.  Restore ฐานข้อมูลที่ใช้
3.  แก้ไขไฟล์ `.env` ในโปรเจกต์ ให้ชี้ไปยัง Database ให้ถูกต้อง
    ```env
    DB_HOST=localhost (หรือ IP เครื่อง Database)
    DB_USER=root
    DB_PASS=รหัสผ่าน
    DB_NAME=ชื่อฐานข้อมูล
    ```

---

## 5. การตั้งค่า Permission (สำคัญมาก!)

เพื่อให้สามารถอัปโหลดไฟล์ (Uploads) และเขียนไฟล์ log ได้:
1.  ไปที่โฟลเดอร์โปรเจกต์ (`C:\inetpub\wwwroot\hospital_news`)
2.  คลิกขวา > **Properties** > **Security**
3.  กด **Edit...** > **Add...**
4.  พิมพ์ `IIS AppPool\HospitalNews` (เปลี่ยน HospitalNews เป็นชื่อ Site Name ที่ตั้งในข้อ 3)
    *   *หรือถ้าหาไม่เจอ ลองใช้ `IUSR` หรือ `IIS_IUSRS` (แต่ security จะต่ำกว่า)*
5.  กด **Check Names** ถ้าถูกต้องจะขึ้นขีดเส้นใต้
6.  กด OK และติ๊กช่อง **Full Control** หรืออย่างน้อยต้องมี **Modify**, **Read & execute**, **List folder contents**, **Read**, **Write**
7.  กด OK เพื่อบันทึก

---

## 6. ทดสอบการใช้งาน

1.  เปิด Browser แล้วเข้า `http://localhost:8080` (หรือพอร์ตที่ตั้งไว้)
2.  ควรจะเห็นหน้าเว็บขึ้นมา
3.  ลอง Login Admin และทดสอบอัปโหลดไฟล์

---

## ปัญหาไฟล์แนบภาษาไทย (Optional)

บน Windows Server บางครั้งการจัดการไฟล์ชื่อภาษาไทยอาจมีปัญหา แนะนำให้ติดตั้ง **Thai Language Pack** ใน Windows Settings > Time & Language

---

## การแก้ไขปัญหาเบื้องต้น (Troubleshooting)

*   **Error 500.19**: มักเกิดจากไม่ได้ติดตั้ง URL Rewrite Module
*   **Error 500 หรือ node.js error**:
    *   เข้าไปดูในโฟลเดอร์โปรเจกต์ จะมีโฟลเดอร์ `iisnode` สร้างขึ้นมาอัตโนมัติ
    *   เปิดไฟล์ log ในนั้นเพื่อดู error อย่างละเอียด
*   **เชื่อมต่อ Database ไม่ได้**:
    *   ตรวจสอบ Firewall (Port 3306)
    *   ตรวจสอบ User/Password ใน `.env`
