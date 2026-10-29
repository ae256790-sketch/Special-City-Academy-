import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// إعدادات فايربيس (تأكد إنها مطابقة للمشروع عندك)
const firebaseConfig = {
  // يرجى التأكد من بيانات الفايربيس الخاصة بك هنا أو تركها كما هي في ملفك الحالي
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

document.addEventListener("DOMContentLoaded", () => {
  // تفعيل القائمة الجانبية للموبايل
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");
  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      navLinks.classList.toggle("active");
    });
  }

  // إدارة تسجيل دخول لوحة التحكم
  const adminLoginForm = document.getElementById("adminLoginForm");
  const adminDashboard = document.getElementById("adminDashboard");
  const adminLoginMessage = document.getElementById("adminLoginMessage");
  const adminLogout = document.getElementById("adminLogout");

  // التحقق من حالة الدخول السابقة
  if (sessionStorage.getItem("isAdminLoggedIn") === "true") {
    if (adminLoginForm) adminLoginForm.style.display = "none";
    if (adminDashboard) adminDashboard.classList.remove("hidden");
  }

  if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const pass = document.getElementById("adminPassword").value;
      // كلمة المرور الافتراضية (يمكنك تعديلها)
      if (pass === "123456" || pass === "omar2026") {
        sessionStorage.setItem("isAdminLoggedIn", "true");
        adminLoginForm.style.display = "none";
        adminDashboard.classList.remove("hidden");
        adminLoginMessage.textContent = "";
      } else {
        adminLoginMessage.textContent = "كلمة المرور غير صحيحة!";
        adminLoginMessage.style.color = "red";
      }
    });
  }

  if (adminLogout) {
    adminLogout.addEventListener("click", () => {
      sessionStorage.removeItem("isAdminLoggedIn");
      location.reload();
    });
  }

  // 1. نظام نشر الفيديوهات والمنشورات (مرن جداً: يقبل ملف أو رابط أو وصف بدون إجبار)
  const createPostForm = document.getElementById("createPostForm");
  if (createPostForm) {
    createPostForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const content = document.getElementById("postContent").value.trim();
      const mediaFile = document.getElementById("postMediaFile").files[0];
      const mediaUrlInput = document.getElementById("postMediaUrlInput").value.trim();
      const uploadStatus = document.getElementById("uploadStatus");

      // الشرط المرن الجديد: يقبل لو في وصف أو ملف أو رابط
      if (!content && !mediaFile && !mediaUrlInput) {
        alert("برجاء كتابة وصف أو رفع فيديو/صورة من المعرض أو وضع رابط!");
        return;
      }

      uploadStatus.textContent = "جاري النشر ومعالجة الملف...";
      uploadStatus.style.color = "#2563eb";

      try {
        let finalMediaUrl = mediaUrlInput;
        let mediaType = "none";

        // لو تم اختيار ملف من المعرض
        if (mediaFile) {
          const fileFolderRef = storageRef(storage, `academy_posts/${Date.now()}_${mediaFile.name}`);
          const snapshot = await uploadBytes(fileFolderRef, mediaFile);
          finalMediaUrl = await getDownloadURL(snapshot.ref);
          mediaType = mediaFile.type.startsWith("video") ? "video" : "image";
        } else if (mediaUrlInput) {
          mediaType = "url";
        }

        // حفظ البيانات في قاعدة بيانات Firebase Realtime Database
        const postsRef = ref(db, "academy_posts");
        const newPostRef = push(postsRef);
        await set(newPostRef, {
          content: content,
          mediaUrl: finalMediaUrl,
          mediaType: mediaType,
          timestamp: Date.now(),
          author: "مستر عمر رمزي"
        });

        uploadStatus.textContent = "تم نشر النشاط بنجاح للعامة! 🚀";
        uploadStatus.style.color = "#16a34a";
        createPostForm.reset();

        setTimeout(() => {
          uploadStatus.textContent = "";
        }, 4000);

      } catch (error) {
        console.error(error);
        uploadStatus.textContent = "حدث خطأ أثناء النشر، حاول مرة أخرى.";
        uploadStatus.style.color = "red";
      }
    });
  }

  // 2. تحميل وعرض المنشورات للعامة في الموقع
  const socialFeedContainer = document.getElementById("socialFeedContainer");
  const adminPostsManageList = document.getElementById("adminPostsManageList");

  const postsRef = ref(db, "academy_posts");
  onValue(postsRef, (snapshot) => {
    const data = snapshot.val();
    if (!socialFeedContainer) return;

    if (!data) {
      socialFeedContainer.innerHTML = `<div style="text-align: center; padding: 30px; color: #64748b; background: white; border-radius: 16px;">لا توجد منشورات أو فيديوهات مضافة حالياً.</div>`;
      if (adminPostsManageList) adminPostsManageList.innerHTML = `<p style="color: #64748b; font-size: 13px;">لا توجد منشورات مرفوعة حالياً.</p>`;
      return;
    }

    let feedHtml = "";
    let adminManageHtml = "";

    const postsArray = Object.entries(data).reverse(); // الأحدث أولاً

    postsArray.forEach(([id, post]) => {
      let mediaHtml = "";

      if (post.mediaType === "video" || (post.mediaUrl && (post.mediaUrl.includes(".mp4") || post.mediaUrl.includes("firebasestorage")))) {
        mediaHtml = `
          <div style="position: relative; width: 100%; border-radius: 12px; overflow: hidden; background: #000; margin-top: 12px;">
            <video controls style="width: 100%; max-height: 450px; display: block;" src="${post.mediaUrl}"></video>
          </div>`;
      } else if (post.mediaType === "image") {
        mediaHtml = `<div style="margin-top: 12px;"><img src="${post.mediaUrl}" style="width: 100%; border-radius: 12px; object-fit: cover;" alt="صورة النشاط"></div>`;
      } else if (post.mediaType === "url" || post.mediaUrl) {
        // فحص لو رابط يوتيوب
        if (post.mediaUrl.includes("youtube.com") || post.mediaUrl.includes("youtu.be")) {
          let ytEmbedUrl = post.mediaUrl;
          if (ytEmbedUrl.includes("watch?v=")) {
            ytEmbedUrl = ytEmbedUrl.replace("watch?v=", "embed/");
          } else if (ytEmbedUrl.includes("youtu.be/")) {
            ytEmbedUrl = ytEmbedUrl.replace("youtu.be/", "www.youtube.com/embed/");
          }
          mediaHtml = `
            <div style="position: relative; width: 100%; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px; background: #000; margin-top: 12px;">
              <iframe src="${ytEmbedUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;" allowfullscreen></iframe>
            </div>`;
        } else {
          mediaHtml = `
            <div style="position: relative; width: 100%; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px; background: #000; margin-top: 12px;">
              <iframe src="${post.mediaUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;" allowfullscreen></iframe>
            </div>`;
        }
      }

      feedHtml += `
        <div style="background: white; border-radius: 20px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <img src="https://files.catbox.moe/pq1rnu.jpg" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover;" alt="مستر عمر">
            <div>
              <strong style="display: block; color: #0f172a; font-size: 0.95rem;">مستر عمر رمزي</strong>
              <small style="color: #64748b; font-size: 0.75rem;">Special City Academy • نشاط جديد</small>
            </div>
          </div>
          ${post.content ? `<p style="color: #334155; font-size: 0.95rem; line-height: 1.6; margin-bottom: 10px;">${post.content}</p>` : ""}
          ${mediaHtml}
        </div>`;

      adminManageHtml += `
        <div style="display: flex; justify-content: space-between; align-items: center; background: white; padding: 10px 15px; border-radius: 10px; margin-bottom: 8px; border: 1px solid #f3e8ff;">
          <span style="font-size: 0.85rem; color: #334155; max-width: 70%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${post.content || "فيديو/صورة مرفوعة"}</span>
          <button onclick="window.deleteAcademyPost('${id}')" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">حذف</button>
        </div>`;
    });

    socialFeedContainer.innerHTML = feedHtml;
    if (adminPostsManageList) adminPostsManageList.innerHTML = adminManageHtml;
  });

  // دالة الحذف العامة
  window.deleteAcademyPost = async function(postId) {
    if (confirm("هل أنت متأكد من حذف هذا المنشور نهائياً؟")) {
      try {
        await remove(ref(db, `academy_posts/${postId}`));
        alert("تم الحذف بنجاح!");
      } catch (err) {
        console.error(err);
        alert("حدث خطأ أثناء الحذف.");
      }
    }
  };

  // 3. نظام الحجوزات وإرسالها لـ Firebase
  const bookingForm = document.getElementById("bookingForm");
  const bookingMessage = document.getElementById("bookingMessage");

  if (bookingForm) {
    bookingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      bookingMessage.textContent = "جاري إرسال طلب الحجز...";
      bookingMessage.style.color = "#2563eb";

      const formData = {
        parentName: document.getElementById("parent_name").value,
        childName: document.getElementById("child_name").value,
        childAge: document.getElementById("child_age").value,
        phone: document.getElementById("phone").value,
        service: document.getElementById("service").value,
        bookingDate: document.getElementById("bookingDate").value,
        bookingPeriod: document.getElementById("bookingPeriod").value,
        timestamp: Date.now()
      };

      try {
        const bookingsRef = ref(db, "academy_bookings");
        const newBookingRef = push(bookingsRef);
        await set(newBookingRef, formData);

        bookingMessage.textContent = "تم إرسال طلب حجزك بنجاح وسنتواصل معك قريباً! 🎉";
        bookingMessage.style.color = "#16a34a";
        bookingForm.reset();
      } catch (err) {
        console.error(err);
        bookingMessage.textContent = "حدث خطأ أثناء إرسال الحجز، حاول مرة أخرى.";
        bookingMessage.style.color = "red";
      }
    });
  }

  // 4. جلب وعرض الحجوزات للادمن
  const dynamicBookingsList = document.getElementById("dynamicBookingsList");
  if (dynamicBookingsList) {
    const bookingsRef = ref(db, "academy_bookings");
    onValue(bookingsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        dynamicBookingsList.innerHTML = `<h4 style="color: var(--navy); margin-bottom: 10px;">📋 الحجوزات الواردة</h4><p style="color: #64748b; font-size: 13px;">لا توجد حجوزات جديدة حالياً.</p>`;
        return;
      }

      let html = `<h4 style="color: var(--navy); margin-bottom: 15px;">📋 الحجوزات الواردة (${Object.keys(data).length})</h4><div style="display: flex; flex-direction: column; gap: 12px;">`;
      
      Object.entries(data).reverse().forEach(([id, b]) => {
        html += `
          <div style="background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: right;">
            <p style="margin: 0 0 5px 0;"><strong>ولي الأمر:</strong> ${b.parentName} | <strong>الطفل:</strong> ${b.childName} (${b.childAge})</p>
            <p style="margin: 0 0 5px 0;"><strong>الخدمة:</strong> ${b.service} | <strong>التاريخ:</strong> ${b.bookingDate} (${b.bookingPeriod})</p>
            <p style="margin: 0 0 10px 0;"><strong>الهاتف:</strong> <a href="tel:${b.phone}" style="color: #2563eb;">${b.phone}</a></p>
            <button onclick="window.deleteBooking('${id}')" style="background: #ef4444; color: white; border: none; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 11px;">حذف الحجز</button>
          </div>`;
      });

      html += `</div>`;
      dynamicBookingsList.innerHTML = html;
    });
  }

  window.deleteBooking = async function(bookingId) {
    if (confirm("هل تريد حذف هذا الحجز؟")) {
      await remove(ref(db, `academy_bookings/${bookingId}`));
    }
  };
});
