const Movement = require("../models/Movement");
const cloudinary = require("../utils/cloudinary");
const { Readable } = require("stream");

const extractPublicId = (url) => {
  const parts = url.split("/");
  const filename = parts[parts.length - 1];
  return filename.split(".")[0]; // abc123.jpg -> abc123
};

const uploadToCloudinary = (buffer, mimetype = "image/jpeg") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "movements", resource_type: "auto" },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    Readable.from(buffer).pipe(stream);
  });
};

const getAllMovements = async (req, res) => {
  try {
    const movements = await Movement.find().sort("-createdAt");

    res.status(200).json(movements);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Hareketler yüklenirken bir hata oluştu." });
  }
};

const getMovementById = async (req, res) => {
  const { id } = req.params;
  console.log("Gelen ID:", id); // ID kontrolü

  try {
    const movement = await Movement.findById(id);
    if (!movement) {
      return res.status(404).json({ message: "Hareket bulunamadı." });
    }
    res.status(200).json(movement);
  } catch (error) {
    res.status(500).json({ message: "Hareket getirilirken bir hata oluştu." });
  }
};

const createMovement = async (req, res) => {
  try {
    const { movementName, movementDesc, movementContent } = req.body;

    if (!movementName) {
      return res.status(400).json({ message: "Hareket adı zorunludur." });
    }

    // Cloudinary'ye kapak resmi ve içerik medyalarını yükle
    const mediaUrls = [];
    let coverImageUrl = null;
    let uploadedFiles = {}; // Her dosya için metadata tutan nesne

    if (req.files && req.files.length > 0) {
      // İlk olarak cover/kapak resmini bul ve yükle
      const coverFile = req.files.find((file) => file.fieldname === "cover");

      if (coverFile) {
        const coverUploadPromise = new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "movements/covers",
              resource_type: "image",
            },
            (error, result) => {
              if (error) {
                console.error("Kapak resmi yükleme hatası:", error);
                return reject(error);
              }
              resolve(result.secure_url);
            }
          );

          Readable.from(coverFile.buffer).pipe(uploadStream);
        });

        coverImageUrl = await coverUploadPromise;
      }

      // İçerik medyalarını benzersiz kimlik numaralarıyla yükle
      const contentFiles = req.files.filter(
        (file) => file.fieldname === "files" && file !== coverFile
      );

      for (const file of contentFiles) {
        // Dosya adından veya özel alanlardan benzersiz tanımlayıcı oluştur
        const fileId = file.originalname.split(".")[0]; // Dosya adını uzantısız olarak kullan

        const uploadPromise = new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "movements/content",
              resource_type: "auto", // hem video hem görseli destekler
              public_id: fileId, // Benzersiz bir isim kullan
            },
            (error, result) => {
              if (error) {
                console.error("İçerik medya yükleme hatası:", error);
                return reject(error);
              }
              resolve({
                url: result.secure_url,
                publicId: result.public_id,
                originalName: file.originalname,
                fileId: fileId,
                mimeType: file.mimetype,
              });
            }
          );

          Readable.from(file.buffer).pipe(uploadStream);
        });

        const uploadResult = await uploadPromise;
        // Dosya adı ile yüklenen URL arasında bir eşleme oluştur
        uploadedFiles[fileId] = uploadResult;

        mediaUrls.push({
          url: uploadResult.url,
          type: file.mimetype.startsWith("video") ? "video" : "image",
          fileId: fileId, // Benzersiz tanımlayıcı
          originalName: file.originalname,
        });
      }
    }

    // İçerik öğelerini oluştur ve medya öğeleriyle eşleştir
    const parsedContent = JSON.parse(movementContent);

    // Her içerik öğesine benzersiz tanımlayıcı ekleyerek medya öğeleriyle eşleştir
    const processedContent = parsedContent.map((item, index) => {
      if (item.type === "text") {
        return {
          ...item,
          contentId: `text-${index}`, // Text öğeleri için benzersiz ID
        };
      } else {
        // Dosya adından fileId oluştur
        const fileId = item.name ? item.name.split(".")[0] : `media-${index}`;

        // Yüklenen dosyalardan eşleşen dosyayı bul
        const mediaFile =
          uploadedFiles[fileId] ||
          mediaUrls.find(
            (m) => m.fileId === fileId || m.originalName === item.name
          );

        return {
          ...item,
          contentId: `media-${index}`, // Benzersiz içerik ID'si
          fileId: fileId, // Medya dosyasının benzersiz ID'si
          url: mediaFile ? mediaFile.url : null,
        };
      }
    });

    // Yeni hareket oluştur
    const newMovement = new Movement({
      movementName,
      movementDesc,
      movementImage: coverImageUrl, // Kapak resmi URL'si
      movementContent: processedContent, // İşlenmiş içerik (fileId ile birlikte)
      media: mediaUrls, // Tüm medya URL'leri
      createdAt: new Date(),
    });

    const savedMovement = await newMovement.save();
    res.status(201).json(savedMovement);
  } catch (error) {
    console.error("Hareket Oluşturma Hatası:", error);
    res.status(500).json({ message: "Hareket oluşturulurken hata oluştu." });
  }
};

const updateMovement = async (req, res) => {
  const { id } = req.params;
  const { movementName, movementDesc, movementContent } = req.body;

  try {
    const updatedFields = { movementName, movementDesc };
    let uploadedFiles = {};
    const mediaUrls = [];

    // Kapak resmi varsa yükle
    const coverFile = req.files?.find((file) => file.fieldname === "cover");
    if (coverFile) {
      const coverUploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "movements/covers",
            resource_type: "image",
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url);
          }
        );
        Readable.from(coverFile.buffer).pipe(uploadStream);
      });

      const coverImageUrl = await coverUploadPromise;
      updatedFields.movementImage = coverImageUrl;
    }

    // Diğer medya dosyaları varsa yükle
    const contentFiles =
      req.files?.filter((f) => f.fieldname === "files") || [];

    for (const file of contentFiles) {
      const fileId = file.originalname.split(".")[0];

      const uploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "movements/content",
            resource_type: "auto",
            public_id: fileId,
          },
          (error, result) => {
            if (error) return reject(error);
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              originalName: file.originalname,
              fileId: fileId,
              mimeType: file.mimetype,
            });
          }
        );
        Readable.from(file.buffer).pipe(uploadStream);
      });

      const uploadResult = await uploadPromise;
      uploadedFiles[fileId] = uploadResult;

      mediaUrls.push({
        url: uploadResult.url,
        type: file.mimetype.startsWith("video") ? "video" : "image",
        fileId: fileId,
        originalName: file.originalname,
      });
    }

    // İçerik varsa ve string ise işle
    if (movementContent) {
      const parsedContent =
        typeof movementContent === "string"
          ? JSON.parse(movementContent)
          : movementContent;

      const processedContent = parsedContent.map((item, index) => {
        if (item.type === "text") {
          return {
            ...item,
            contentId: `text-${index}`,
          };
        } else {
          const fileId = item.name ? item.name.split(".")[0] : `media-${index}`;
          const mediaFile =
            uploadedFiles[fileId] ||
            mediaUrls.find(
              (m) => m.fileId === fileId || m.originalName === item.name
            );

          return {
            ...item,
            contentId: `media-${index}`,
            fileId: fileId,
            url: mediaFile ? mediaFile.url : item.url || null,
          };
        }
      });

      updatedFields.movementContent = processedContent;
      updatedFields.media = mediaUrls; // istersen bunu da güncelleyebilirsin
    }

    const updatedMovement = await Movement.findByIdAndUpdate(
      id,
      updatedFields,
      {
        new: true,
      }
    );

    if (!updatedMovement) {
      return res.status(404).json({ message: "Hareket bulunamadı." });
    }

    res.status(200).json(updatedMovement);
  } catch (error) {
    console.error("Hareket güncelleme hatası:", error);
    res
      .status(500)
      .json({ message: "Hareket güncellenirken bir hata oluştu." });
  }
};

const deleteMovement = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedMovement = await Movement.findByIdAndDelete(id);

    if (!deletedMovement) {
      return res.status(404).json({ message: "Hareket bulunamadı." });
    }

    // Cloudinary'den görseli kaldır
    const imageUrl = deletedMovement.movementImage;
    if (imageUrl) {
      const publicId = extractPublicId(imageUrl); // Bu fonksiyonun doğru çalıştığından emin ol
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    }

    res.status(200).json({ message: "Hareket başarıyla silindi." });
  } catch (error) {
    console.error("Hareket silme hatası:", error);
    res.status(500).json({ message: "Hareket silinirken bir hata oluştu." });
  }
};

module.exports = {
  getAllMovements,
  getMovementById,
  createMovement,
  updateMovement,
  deleteMovement,
};
