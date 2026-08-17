package com.hairsaloon;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class HairSaloonApplicationTest {

    @Test
    void applicationEntryPointIsAvailable() {
        assertThat(HairSaloonApplication.class).isNotNull();
    }
}
