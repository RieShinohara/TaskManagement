package com.example.taskmanagement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import java.io.IOException;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import com.example.taskmanagement.controller.BackgroundImageController;
import com.example.taskmanagement.exception.PayloadTooLargeException;
import com.example.taskmanagement.service.BackgroundImageService;

import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;

// 背景画像の登録で、大きすぎる本文を「読み込む前に」断ることのテスト。
// 本物のサーバーに巨大な本文を送らず、「どれだけ読んだか」を数える偽のリクエストで確かめる
class BackgroundImageControllerTests {

	private static final int LIMIT = BackgroundImageService.MAX_BYTES;

	private final BackgroundImageController controller = new BackgroundImageController(
			mock(BackgroundImageService.class));

	@Test
	void 送られてくる大きさが上限を超えると_本文を1バイトも読まずに413() {
		CountingRequest request = new CountingRequest(LIMIT + 1L);

		assertThatThrownBy(() -> controller.put("sky", request)).isInstanceOf(PayloadTooLargeException.class);
		assertThat(request.bytesRead()).isZero();
	}

	@Test
	void 大きさが分からない送り方でも_上限より1バイト多く読んだところでやめて413() {
		CountingRequest request = new CountingRequest(-1); // 大きさを申告しない。本文は、いくらでも続く

		assertThatThrownBy(() -> controller.put("sky", request)).isInstanceOf(PayloadTooLargeException.class);
		assertThat(request.bytesRead()).isEqualTo(LIMIT + 1L);
	}

	// 申告する大きさを自由に決められて、本文はいくらでも続き、読んだバイト数を数えるリクエスト
	private static class CountingRequest extends MockHttpServletRequest {

		private final long declaredLength;
		private long bytesRead;

		CountingRequest(long declaredLength) {
			this.declaredLength = declaredLength;
		}

		long bytesRead() {
			return bytesRead;
		}

		@Override
		public long getContentLengthLong() {
			return declaredLength;
		}

		@Override
		public ServletInputStream getInputStream() {
			return new ServletInputStream() {
				@Override
				public int read() {
					bytesRead++;
					return 0xFF;
				}

				@Override
				public int read(byte[] buffer, int offset, int length) throws IOException {
					for (int i = 0; i < length; i++) {
						buffer[offset + i] = (byte) 0xFF;
					}
					bytesRead += length;
					return length;
				}

				@Override
				public boolean isFinished() {
					return false;
				}

				@Override
				public boolean isReady() {
					return true;
				}

				@Override
				public void setReadListener(ReadListener readListener) {
				}
			};
		}
	}
}
