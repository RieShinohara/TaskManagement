package com.example.taskmanagement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.io.IOException;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.servlet.HandlerExceptionResolver;

import com.example.taskmanagement.controller.BackupBodyLimitFilter;
import com.example.taskmanagement.exception.PayloadTooLargeException;
import com.example.taskmanagement.service.BackupService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;

// バックアップの復元で、大きすぎる本文を「読み込む前に」「読みすぎる前に」断ることのテスト。
// 本物のサーバーに巨大な本文を送らず、「どれだけ読んだか」を数える偽のリクエストで確かめる
class BackupBodyLimitFilterTests {

	private static final long LIMIT = BackupService.MAX_BYTES;

	private final HandlerExceptionResolver resolver = mock(HandlerExceptionResolver.class);
	private final BackupBodyLimitFilter filter = new BackupBodyLimitFilter(resolver);

	@Test
	void 送られてくる大きさが上限を超えると_本文を1バイトも読まずに断る() throws Exception {
		CountingRequest request = restoreRequest(LIMIT + 1);
		FilterChain chain = mock(FilterChain.class);

		filter.doFilter(request, new MockHttpServletResponse(), chain);

		ArgumentCaptor<Exception> thrown = ArgumentCaptor.forClass(Exception.class);
		verify(resolver).resolveException(any(), any(), isNull(), thrown.capture());
		assertThat(thrown.getValue()).isInstanceOf(PayloadTooLargeException.class);
		verifyNoInteractions(chain); // 先へは進めない
		assertThat(request.bytesRead()).isZero();
	}

	@Test
	void 大きさが分からない送り方でも_上限より1バイト多く読んだところでやめて断る() {
		CountingRequest request = restoreRequest(-1); // 大きさを申告しない。本文は、いくらでも続く

		assertThatThrownBy(() -> filter.doFilter(request, new MockHttpServletResponse(), readEverything()))
				.isInstanceOf(PayloadTooLargeException.class);
		assertThat(request.bytesRead()).isEqualTo(LIMIT + 1);
	}

	@Test
	void 上限ちょうどまでは_読める() throws Exception {
		CountingRequest request = restoreRequest(LIMIT, LIMIT); // 申告も、実際の本文も、ちょうど上限

		filter.doFilter(request, new MockHttpServletResponse(), readEverything());

		assertThat(request.bytesRead()).isEqualTo(LIMIT);
		verifyNoInteractions(resolver);
	}

	@Test
	void 復元以外の窓口は_大きさを見ない() throws Exception {
		CountingRequest request = new CountingRequest(LIMIT * 10, LIMIT * 10);
		request.setMethod("POST");
		request.setRequestURI("/api/cards");
		MockFilterChain chain = new MockFilterChain();

		filter.doFilter(request, new MockHttpServletResponse(), chain);

		assertThat(chain.getRequest()).isSameAs(request); // 包まれず、そのまま先へ
		verifyNoInteractions(resolver);
	}

	// 本文を、最後まで読む（読み込みを行う側の代わり）
	private static FilterChain readEverything() {
		return (request, response) -> request.getInputStream().readAllBytes();
	}

	private static CountingRequest restoreRequest(long declaredLength) {
		return restoreRequest(declaredLength, Long.MAX_VALUE);
	}

	private static CountingRequest restoreRequest(long declaredLength, long actualLength) {
		CountingRequest request = new CountingRequest(declaredLength, actualLength);
		request.setMethod("POST");
		request.setRequestURI("/api/backup/restore");
		return request;
	}

	// 申告する大きさと、実際の本文の長さを、自由に決められて、読んだバイト数を数えるリクエスト
	private static class CountingRequest extends MockHttpServletRequest {

		private final long declaredLength;
		private final long actualLength;
		private long bytesRead;

		CountingRequest(long declaredLength, long actualLength) {
			this.declaredLength = declaredLength;
			this.actualLength = actualLength;
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
					if (bytesRead >= actualLength) {
						return -1;
					}
					bytesRead++;
					return ' ';
				}

				@Override
				public int read(byte[] buffer, int offset, int length) throws IOException {
					if (bytesRead >= actualLength) {
						return -1;
					}
					int count = (int) Math.min(length, actualLength - bytesRead);
					for (int i = 0; i < count; i++) {
						buffer[offset + i] = ' ';
					}
					bytesRead += count;
					return count;
				}

				@Override
				public boolean isFinished() {
					return bytesRead >= actualLength;
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
