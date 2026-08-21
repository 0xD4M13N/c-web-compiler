FROM gcc:13-bookworm

RUN mkdir -p /workspace \
    && chown nobody:nogroup /workspace

WORKDIR /workspace
USER nobody:nogroup

CMD ["gcc", "--version"]