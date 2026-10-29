import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, setDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyB_70Yvw8rtLcSfBFDIHWL-5qxdpHLdaE",
  authDomain: "speech-cinter.firebaseapp.com",
  projectId: "speech-cinter",
  storageBucket: "speech-cinter.firebasestorage.app",
  messagingSenderId: "122680997828",
  appId: "1:122680997828:web:f206bf2086324f4fd9d691",
  measurementId: "G-42PX2DZWFH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// 1. جلب وعرض المنشورات والفيديوهات في الواجهة العامة
async function loadSocialFeed() {
  const feedContainer = document.getElementById("socialFeedContainer");
  if (!feedContainer) return;

  try {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      feedContainer.innerHTML = `
        <div style="background: white; padding: 40px; border-radius: 20px; text-align: center; color: #64748b; border: 1px dashed #cbd5e1;">
          <p style="font-size: 1.1rem; margin: 0;">مستعدون لعرض أحدث أنشطتكم المتميزة!</p>
          <small>قم بنشر أحدث فيديو أو نشاط من لوحة التحكم ليظهر هنا فوراً.</small>
        </div>
      `;
      return;
    }

    let html = "";
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const mediaUrl = data.mediaUrl || "";

      let mediaElement = "";

      if (mediaUrl.includes("facebook.com") || mediaUrl.includes("fb.watch")) {
        const encodedUrl = encodeURIComponent(mediaUrl);
        mediaElement = `
          <div style="position: relative; width: 100%; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px; background: #000;">
            <iframe 
              src="https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=false&width=500" 
              style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:none;" 
              scrolling="no" 
              frameborder="0" 
              allowfullscreen="true" 
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share">
            </iframe>
          </div>`;
      } else if (mediaUrl.includes("youtube.com") || mediaUrl.includes("youtu.be")) {
        let embedUrl = mediaUrl.includes("watch?v=") ? mediaUrl.replace("watch?v=", "embed/") : mediaUrl;
        mediaElement = `
          <div style="position: relative; width: 100%; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px; background: #000;">
            <iframe src="${embedUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;" allowfullscreen></iframe>
          </div>`;
      } else if (mediaUrl.includes("t.me/")) {
        // دعم فيديو تليجرام المباشر داخل الموقع عبر الودجت الرسمي
        const tgPostPath = mediaUrl.replace("https://t.me/", "").replace("http://t.me/", "");
        mediaElement = `
          <div style="width: 100%; display: flex; justify-content: center; background: #f8fafc; padding: 10px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <script async src="https://telegram.org/js/telegram-widget.js?22" 
                    data-telegram-post="${tgPostPath}" 
                    data-width="100%">
            </script>
          </div>`;
      } else if (data.type === "video" || mediaUrl.match(/\.(mp4|webm|ogg|mov)/i) || mediaUrl.includes("firebasestorage")) {
        mediaElement = `<video src="${mediaUrl}" controls preload="metadata" style="width: 100%; border-radius: 12px;"></video>`;
      } else if (mediaUrl) {
        mediaElement = `<img src="${mediaUrl}" alt="نشاط" loading="lazy" style="width: 100%; border-radius: 12px; object-fit: cover;">`;
      }

      html += `
        <article class="feed-card" style="background: white; border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 20px;">
          <div class="feed-header" style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
            <img src="https://files.catbox.moe/pq1rnu.jpg" alt="مستر عمر رمزي" class="feed-avatar" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover;">
            <div class="feed-author-info">
              <span class="feed-author-name" style="display: block; font-weight: bold; color: #0f172a;">مستر عمر رمزي</span>
              <span class="feed-time" style="font-size: 0.8rem; color: #64748b;">Special City Academy • نشاط جديد</span>
            </div>
          </div>
          ${data.content ? `<div class="feed-content-text" style="margin-bottom: 15px; color: #334155; line-height: 1.6;">${data.content}</div>` : ""}
          ${mediaElement ? `<div class="feed-media-box">${mediaElement}</div>` : ""}
        </article>
      `;
    });

    feedContainer.innerHTML = html;
  } catch (error) {
    console.error(error);
    feedContainer.innerHTML = `<p style="text-align: center; color: #ef4444;">تعذر تحميل المنشورات حالياً.</p>`;
  }
}

loadSocialFeed();

// 2. نشر الوسائط (مرن جداً: رفع من المعرض لوحده، أو رابط لوحده، أو وصف لوحده)
const createPostForm = document.getElementById("createPostForm");
if (createPostForm) {
  createPostForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const content = document.getElementById("postContent").value.trim();
    const mediaFile = document.getElementById("postMediaFile") ? document.getElementById("postMediaFile").files[0] : null;
    const mediaUrlInput = document.getElementById("postMediaUrlInput").value.trim();
    const uploadStatus = document.getElementById("uploadStatus");
    const publishBtn = document.getElementById("publishBtn");

    if (!content && !mediaFile && !mediaUrlInput) {
      alert("برجاء كتابة وصف، أو اختيار فيديو من المعرض، أو وضع رابط!");
      return;
    }

    publishBtn.disabled = true;
    publishBtn.innerText = "⏳ جاري نشر النشاط في الموقع...";
    uploadStatus.style.color = "#2563eb";

    try {
      let finalMediaUrl = mediaUrlInput;
      let mediaType = "url";

      if (mediaFile) {
        const fileRef = storageRef(storage, `academy_posts/${Date.now()}_${mediaFile.name}`);
        const snapshot = await uploadBytes(fileRef, mediaFile);
        finalMediaUrl = await getDownloadURL(snapshot.ref);
        mediaType = mediaFile.type.startsWith("video") ? "video" : "image";
      }

      await addDoc(collection(db, "posts"), {
        content: content,
        mediaUrl: finalMediaUrl,
        type: mediaType,
        createdAt: new Date()
      });

      uploadStatus.style.color = "#16a34a";
      uploadStatus.textContent = "✅ تم نشر النشاط بنجاح للعامة!";
      createPostForm.reset();
      
      loadSocialFeed();
      loadAdminDashboard();
    } catch (err) {
      console.error(err);
      uploadStatus.style.color = "#dc2626";
      uploadStatus.textContent = "❌ حدث خطأ أثناء النشر.";
    } finally {
      publishBtn.disabled = false;
      publishBtn.innerText = "🚀 نشر المنشور فوراً للعامة";
    }
  });
}

// 3. الحجوزات أونلاين
const bookingDate = document.getElementById("bookingDate");
if (bookingDate) {
  const now = new Date();
  bookingDate.min = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}

const bookingForm = document.getElementById("bookingForm");
const bookingMessage = document.getElementById("bookingMessage");

if (bookingForm) {
  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    bookingMessage.className = "form-message";
    const formData = new FormData(bookingForm);
    
    try {
      await addDoc(collection(db, "bookings"), {
        parent_name: formData.get("parent_name"),
        child_name: formData.get("child_name"),
        child_age: formData.get("child_age"),
        phone: formData.get("phone"),
        service: formData.get("service"),
        booking_date: formData.get("booking_date"),
        booking_period: formData.get("booking_period"),
        createdAt: new Date()
      });
      bookingMessage.className = "form-message success";
      bookingMessage.textContent = "تم إرسال طلب الحجز بنجاح ❤️ هنتواصل معاك لتأكيد الموعد.";
      bookingForm.reset();
    } catch (error) {
      console.error(error);
      bookingMessage.className = "form-message error";
      bookingMessage.textContent = "حصلت مشكلة في إرسال الطلب.";
    }
  });
}

// 4. لوحة تحكم الأدمن (تسجيل الدخول والتنفيذ)
const adminLoginForm = document.getElementById("adminLoginForm");
const adminLoginMessage = document.getElementById("adminLoginMessage");
const adminDashboard = document.getElementById("adminDashboard");

if (adminLoginForm) {
  adminLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const passwordInput = document.getElementById("adminPassword").value.trim();

    try {
      const passDoc = await getDoc(doc(db, "settings", "admin_password"));
      let currentPassword = passDoc.exists() ? passDoc.data().password : "1234";

      if (passwordInput === currentPassword) {
        adminLoginForm.classList.add("hidden");
        adminDashboard.classList.remove("hidden");
        loadAdminDashboard();
      } else {
        adminLoginMessage.className = "form-message error";
        adminLoginMessage.textContent = "كلمة المرور خاطئة! (جرب 1234)";
      }
    } catch (err) {
      if (passwordInput === "1234") {
        adminLoginForm.classList.add("hidden");
        adminDashboard.classList.remove("hidden");
        loadAdminDashboard();
      } else {
        adminLoginMessage.className = "form-message error";
        adminLoginMessage.textContent = "كلمة المرور خاطئة!";
      }
    }
  });
}

async function loadAdminDashboard() {
  const postsManageList = document.getElementById("adminPostsManageList");
  if (postsManageList) {
    try {
      const postsQ = query(collection(db, "posts"), orderBy("createdAt", "desc"));
      const postsSnap = await getDocs(postsQ);

      if (postsSnap.empty) {
        postsManageList.innerHTML = "<p style='color: #831843;'>لا توجد منشورات مرفوعة حالياً.</p>";
      } else {
        let pHtml = "";
        postsSnap.forEach((pDoc) => {
          const pData = pDoc.data();
          const pId = pDoc.id;
          pHtml += `
            <div id="admin-post-${pId}" style="background: white; padding: 10px; border-radius: 8px; margin-bottom: 8px; border: 1px solid #fbcfe8; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.85rem; color: #334155; max-width: 75%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                📌 ${pData.content || "منشور أو فيديو مرفوع"}
              </span>
              <button class="delete-post-btn" data-id="${pId}" style="background: #e11d48; color: white; border: none; padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer;">🗑️ حذف المنشور</button>
            </div>
          `;
        });
        postsManageList.innerHTML = pHtml;

        document.querySelectorAll(".delete-post-btn").forEach(btn => {
          btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            if (confirm("هل أنت متأكد من حذف هذا المنشور نهائياً؟")) {
              await deleteDoc(doc(db, "posts", id));
              document.getElementById(`admin-post-${id}`).remove();
              loadSocialFeed();
            }
          });
        });
      }
    } catch (e) {
      console.error(e);
      postsManageList.innerHTML = "<p style='color: red;'>تعذر جلب المنشورات.</p>";
    }
  }

  const dynamicList = document.getElementById("dynamicBookingsList");
  if (dynamicList) {
    dynamicList.innerHTML = "<p>جاري تحميل الحجوزات...</p>";

    try {
      const querySnapshot = await getDocs(collection(db, "bookings"));
      if (querySnapshot.empty) {
        dynamicList.innerHTML = "<p>لا توجد حجوزات مسجلة حتى الآن.</p>";
        return;
      }

      let html = "<h4>قائمة الحجوزات الواردة أونلاين:</h4>";
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;
        let cleanPhone = data.phone ? data.phone.replace(/\D/g, '') : '';
        if (cleanPhone.startsWith('0')) cleanPhone = '2' + cleanPhone;
        const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`مرحباً بحضرتك بخصوص طلب حجز جلسة لطفلك (${data.child_name}) في Special City Academy...`)}`;

        html += `
          <div id="booking-card-${docId}" style="background: #f8f9fa; border-right: 4px solid #448cf5; padding: 15px; margin: 12px 0; border-radius: 10px; text-align: right;">
            <strong>ولي الأمر:</strong> ${data.parent_name}<br>
            <strong>اسم الطفل:</strong> ${data.child_name} (${data.child_age})<br>
            <strong>الهاتف:</strong> <a href="tel:${data.phone}" style="color: #448cf5;">${data.phone}</a>
            <a href="${waLink}" target="_blank" style="background: #25d366; color: white; padding: 3px 8px; border-radius: 5px; font-size: 11px; margin-right: 8px; text-decoration: none;">💬 واتساب</a><br>
            <strong>الخدمة:</strong> ${data.service} | <strong>الموعد:</strong> ${data.booking_date} (${data.booking_period})
            <div style="margin-top: 10px;">
              <button class="delete-btn" data-id="${docId}" style="background: #ff4d4f; color: white; border: none; padding: 5px 12px; border-radius: 6px; font-size: 11px; cursor: pointer;">🗑️ حذف الحجز</button>
            </div>
          </div>
        `;
      });
      
      dynamicList.innerHTML = html;

      document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const id = e.target.getAttribute("data-id");
          if (confirm("هل أنت متأكد من حذف الحجز؟")) {
            await deleteDoc(doc(db, "bookings", id));
            document.getElementById(`booking-card-${id}`).remove();
          }
        });
      });
    } catch (error) {
      console.error(error);
      dynamicList.innerHTML = "<p style='color: red;'>حدث خطأ أثناء تحميل الحجوزات.</p>";
    }
  }
}

// 5. تغيير كلمة المرور وتسجيل الخروج
const changePasswordForm = document.getElementById("changePasswordForm");
if (changePasswordForm) {
  changePasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newPass = document.getElementById("newAdminPassword").value.trim();
    const statusDiv = document.getElementById("passwordChangeStatus");

    if (!newPass) {
      alert("برجاء كتابة كلمة المرور الجديدة!");
      return;
    }

    try {
      await setDoc(doc(db, "settings", "admin_password"), {
        password: newPass
      });

      statusDiv.style.color = "#047857";
      statusDiv.textContent = "✅ تم تغيير كلمة المرور بنجاح!";
      changePasswordForm.reset();
    } catch (err) {
      console.error(err);
      statusDiv.style.color = "#dc2626";
      statusDiv.textContent = "❌ حدث خطأ أثناء تغيير كلمة المرور.";
    }
  });
}

const adminLogout = document.getElementById("adminLogout");
if (adminLogout) {
  adminLogout.addEventListener("click", () => {
    adminDashboard.classList.add("hidden");
    adminLoginForm.classList.remove("hidden");
    adminLoginForm.reset();
  });
}
