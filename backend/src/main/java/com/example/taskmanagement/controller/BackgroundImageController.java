package com.example.taskmanagement.controller;

import java.util.List;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.taskmanagement.dto.BackgroundImageResponse;
import com.example.taskmanagement.entity.UserBackgroundImage;
import com.example.taskmanagement.service.BackgroundImageService;

// 自分の背景画像の窓口。{slot} は、sky（青空）/ sunset（夕焼け）/ night（星空）
@RestController
@RequestMapping("/api/background-images")
public class BackgroundImageController {

	private final BackgroundImageService imageService;

	public BackgroundImageController(BackgroundImageService imageService) {
		this.imageService = imageService;
	}

	// 登録済みの一覧（どの割り当て先に、いつ登録したか）
	@GetMapping
	public List<BackgroundImageResponse> list() {
		return imageService.findAll();
	}

	// 画像そのもの（JPEG）。登録（置き換え）の日時を ETag にして、変わっていなければ、送り直さない（304）
	@GetMapping("/{slot}")
	public ResponseEntity<byte[]> get(@PathVariable String slot) {
		UserBackgroundImage image = imageService.find(slot);
		return ResponseEntity.ok()
				.contentType(MediaType.IMAGE_JPEG)
				.eTag("\"" + image.getUpdatedAt().toEpochMilli() + "\"")
				.cacheControl(CacheControl.noCache())
				.body(image.getImage());
	}

	// 登録（置き換え）。本文は、JPEGのバイト列そのもの
	@PutMapping("/{slot}")
	public BackgroundImageResponse put(@PathVariable String slot, @RequestBody byte[] image) {
		return imageService.save(slot, image);
	}

	// 登録した画像を消す（元に戻す）
	@DeleteMapping("/{slot}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable String slot) {
		imageService.delete(slot);
	}

}
